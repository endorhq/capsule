import type {
  ParsedSession,
  SessionContext,
  TimelineEntry,
  UserEntry,
  AssistantEntry,
  ToolCallEntry,
  SystemEntry,
  FileEntry,
  ThinkingBlock,
  ToolResultMeta,
} from '../types/timeline.js';

interface ToolRequest {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface BufferedToolStart {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
}

function generateId(index: number): string {
  return `entry-${index}`;
}

function extractToolDisplayName(name: string): string {
  switch (name) {
    case 'view':
      return 'Read';
    case 'edit':
      return 'Edit';
    case 'bash':
      return 'Shell';
    case 'report_intent':
      return 'Intent';
    default:
      return name.charAt(0).toUpperCase() + name.slice(1);
  }
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

export function parseCopilotSession(content: string): ParsedSession {
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  const context: SessionContext = { agentName: 'copilot' };
  const timeline: TimelineEntry[] = [];
  const files: FileEntry[] = [];
  const seenFiles = new Set<string>();
  let startTime: Date | undefined;
  let endTime: Date | undefined;
  let entryIndex = 0;

  // Buffers
  const toolRequests = new Map<string, ToolRequest>();
  const toolStarts = new Map<string, BufferedToolStart>();

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    const timestamp = new Date(event.timestamp as string);
    if (!startTime || timestamp < startTime) startTime = timestamp;
    if (!endTime || timestamp > endTime) endTime = timestamp;

    const type = event.type as string;
    const data = event.data as Record<string, unknown> | undefined;
    if (!data) continue;

    switch (type) {
      case 'session.start': {
        const ctx = data.context as Record<string, unknown> | undefined;
        if (ctx) {
          context.cwd = ctx.cwd as string | undefined;
          context.gitBranch = ctx.branch as string | undefined;
          context.gitRepo = ctx.repository as string | undefined;
        }
        context.agentVersion = data.copilotVersion as string | undefined;
        const producer = data.producer as string | undefined;
        if (producer) {
          context.agentName = producer;
        }
        break;
      }

      case 'user.message': {
        const userContent = data.content as string;
        if (userContent) {
          const userEntry: UserEntry = {
            type: 'user',
            id: generateId(entryIndex++),
            timestamp,
            content: userContent,
          };
          timeline.push(userEntry);
        }
        break;
      }

      case 'assistant.message': {
        const msgContent = (data.content as string) || '';
        const requests = (data.toolRequests as ToolRequest[]) || [];
        const reasoningText = data.reasoningText as string | undefined;
        const reasoningOpaque = data.reasoningOpaque as string | undefined;

        // Buffer tool requests for matching with execution events
        for (const req of requests) {
          toolRequests.set(req.toolCallId, req);
        }

        // Build thinking block if reasoning exists
        let thinking: ThinkingBlock | undefined;
        if (reasoningText || reasoningOpaque) {
          thinking = {
            text: reasoningText,
            isEncrypted: !!reasoningOpaque,
            subject: reasoningText
              ? reasoningText.split('\n')[0].slice(0, 100)
              : undefined,
          };
        }

        // Only create an AssistantEntry if there's actual text content
        if (msgContent.trim()) {
          const assistantEntry: AssistantEntry = {
            type: 'assistant',
            id: generateId(entryIndex++),
            timestamp,
            content: msgContent,
            isIntermediate: false,
            thinking,
          };
          timeline.push(assistantEntry);
        } else if (thinking && requests.length === 0) {
          // Reasoning-only message with no tool calls — surface as assistant
          const assistantEntry: AssistantEntry = {
            type: 'assistant',
            id: generateId(entryIndex++),
            timestamp,
            content: reasoningText || '(reasoning only)',
            isIntermediate: true,
            thinking,
          };
          timeline.push(assistantEntry);
        }
        break;
      }

      case 'tool.execution_start': {
        const toolCallId = data.toolCallId as string;
        const toolName = data.toolName as string;
        const args = (data.arguments as Record<string, unknown>) || {};

        toolStarts.set(toolCallId, {
          toolCallId,
          toolName,
          arguments: args,
          timestamp,
        });
        break;
      }

      case 'tool.execution_complete': {
        const toolCallId = data.toolCallId as string;
        const success = data.success as boolean;
        const result = data.result as Record<string, unknown> | undefined;
        const telemetry = data.toolTelemetry as
          | Record<string, unknown>
          | undefined;

        const bufferedStart = toolStarts.get(toolCallId);
        const bufferedRequest = toolRequests.get(toolCallId);
        const toolName =
          bufferedStart?.toolName || bufferedRequest?.name || 'unknown';
        const toolArgs =
          bufferedStart?.arguments || bufferedRequest?.arguments || {};
        const toolTimestamp = bufferedStart?.timestamp || timestamp;

        // Skip report_intent tool — it's meta/noise
        if (toolName === 'report_intent') {
          toolStarts.delete(toolCallId);
          toolRequests.delete(toolCallId);
          break;
        }

        const resultContent = result?.content as string | undefined;
        const detailedContent = result?.detailedContent as string | undefined;

        // Build structured metadata
        const resultMeta: ToolResultMeta = {};
        resultMeta.output = resultContent || '';

        // Duration from start/complete timestamps
        if (bufferedStart) {
          const durationMs =
            timestamp.getTime() - bufferedStart.timestamp.getTime();
          if (durationMs > 0) {
            resultMeta.duration =
              durationMs >= 1000
                ? `${(durationMs / 1000).toFixed(1)}s`
                : `${durationMs}ms`;
          }
        }

        // Extract telemetry metrics
        const metrics = telemetry?.metrics as
          | Record<string, number>
          | undefined;
        if (metrics) {
          if (metrics.linesAdded !== undefined)
            resultMeta.linesAdded = metrics.linesAdded;
          if (metrics.linesRemoved !== undefined)
            resultMeta.linesRemoved = metrics.linesRemoved;
        }

        // Extract file paths from telemetry or arguments
        const restricted = telemetry?.restrictedProperties as
          | Record<string, string>
          | undefined;
        if (restricted?.filePaths) {
          try {
            resultMeta.files = JSON.parse(restricted.filePaths);
          } catch {
            // ignore
          }
        } else if (toolArgs.path) {
          resultMeta.files = [toolArgs.path as string];
        }

        // File tracking
        const filePath = (toolArgs.path as string) || '';
        if (filePath) {
          const operation = toolName === 'edit' ? 'edited' : 'read';
          const fileKey = filePath + ':' + operation;
          if (!seenFiles.has(fileKey)) {
            seenFiles.add(fileKey);
            files.push({ path: filePath, operation });
          }
        }

        // Build summary
        let summary: string | undefined;
        if (filePath) {
          const name = basename(filePath);
          if (toolName === 'view') {
            const lines = resultContent?.split('\n').length || 0;
            summary = `file: ${name} // ${lines} lines read`;
          } else if (toolName === 'edit') {
            const parts: string[] = [`file: ${name}`];
            if (resultMeta.linesAdded || resultMeta.linesRemoved) {
              parts.push(
                `+${resultMeta.linesAdded || 0} -${resultMeta.linesRemoved || 0}`
              );
            }
            summary = parts.join(' // ');
          } else {
            summary = `file: ${name}`;
          }
        }

        const toolEntry: ToolCallEntry = {
          type: 'tool_call',
          id: generateId(entryIndex++),
          timestamp: toolTimestamp,
          name: toolName,
          displayName: extractToolDisplayName(toolName),
          status: success ? 'success' : 'error',
          arguments: toolArgs,
          result: detailedContent || resultContent || '',
          resultMeta,
          summary,
        };
        timeline.push(toolEntry);

        toolStarts.delete(toolCallId);
        toolRequests.delete(toolCallId);
        break;
      }

      // assistant.turn_start / assistant.turn_end — lifecycle brackets, skip
      default:
        break;
    }
  }

  // Any still-pending tool requests that never completed
  for (const [, req] of toolRequests) {
    if (req.name === 'report_intent') continue;
    const toolEntry: ToolCallEntry = {
      type: 'tool_call',
      id: generateId(entryIndex++),
      timestamp: endTime || new Date(),
      name: req.name,
      displayName: extractToolDisplayName(req.name),
      status: 'aborted',
      arguments: req.arguments,
    };
    timeline.push(toolEntry);
  }

  const duration =
    startTime && endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
      : undefined;

  return {
    format: 'copilot',
    context,
    startTime: startTime || new Date(),
    endTime,
    duration,
    timeline,
    files,
  };
}
