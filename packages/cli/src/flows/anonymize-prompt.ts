import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import {
  ANONYMIZE_OPTION_LABELS,
  type AnonymizeOptions,
  anonymize,
  DEFAULT_OPTIONS,
} from '../anonymize.js';

const SELECT_ALL = '__select_all__' as const;

const VALID_KEYS = Object.keys(ANONYMIZE_OPTION_LABELS) as Array<
  keyof AnonymizeOptions
>;

function parseAnonymizeFlag(value: string): Array<keyof AnonymizeOptions> {
  if (value === 'all') return [...VALID_KEYS];
  if (value === 'none') return [];

  const keys = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const invalid = keys.filter(
    k => !VALID_KEYS.includes(k as keyof AnonymizeOptions)
  );
  if (invalid.length > 0) {
    throw new Error(
      `Invalid anonymize options: ${invalid.join(', ')}. Valid options: ${VALID_KEYS.join(', ')}`
    );
  }
  return keys as Array<keyof AnonymizeOptions>;
}

function applyAnonymization(
  content: string,
  format: AgentFormat,
  selectedKeys: Array<keyof AnonymizeOptions>
): string {
  if (selectedKeys.length === 0) return content;

  const options: AnonymizeOptions = { ...DEFAULT_OPTIONS };
  for (const key of selectedKeys) {
    options[key] = true;
  }
  return anonymize(content, format, options);
}

export async function promptAndAnonymize(
  content: string,
  format: AgentFormat
): Promise<string> {
  const anonChoices = await p.multiselect({
    message: 'Select anonymization options:',
    options: [
      { value: SELECT_ALL, label: 'Select all' },
      ...VALID_KEYS.map(key => ({
        value: key,
        label: ANONYMIZE_OPTION_LABELS[key],
      })),
    ],
    required: false,
  });
  if (p.isCancel(anonChoices)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  const selectAll = anonChoices.includes(SELECT_ALL as never);
  const selectedKeys = selectAll
    ? VALID_KEYS
    : (anonChoices as Array<keyof AnonymizeOptions>);

  if (selectedKeys.length > 0) {
    const spinner = p.spinner();
    spinner.start('Anonymizing session');
    const anonymized = applyAnonymization(content, format, selectedKeys);
    spinner.stop('Session anonymized');
    return anonymized;
  }

  p.log.info('No anonymization applied');
  return content;
}

export async function resolveAnonymization(
  content: string,
  format: AgentFormat,
  options: { anonymize?: string; interactive: boolean }
): Promise<string> {
  if (options.interactive && options.anonymize === undefined) {
    return promptAndAnonymize(content, format);
  }

  const flagValue = options.anonymize ?? 'none';
  const selectedKeys = parseAnonymizeFlag(flagValue);
  return applyAnonymization(content, format, selectedKeys);
}
