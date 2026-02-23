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

export interface AnonymizeFlags {
  anonymize?: string;
  noAnonymize?: boolean;
}

function parseAnonymizeKeys(input: string): Array<keyof AnonymizeOptions> {
  if (input === 'all') return [...VALID_KEYS];
  if (input === 'none') return [];

  const keys = input.split(',').map(k => k.trim());
  const invalid = keys.filter(
    k => !VALID_KEYS.includes(k as keyof AnonymizeOptions)
  );
  if (invalid.length > 0) {
    console.error(
      `Invalid anonymize option(s): ${invalid.join(', ')}\nValid options: ${VALID_KEYS.join(', ')}, all, none`
    );
    process.exit(1);
  }
  return keys as Array<keyof AnonymizeOptions>;
}

function applyKeys(
  content: string,
  format: AgentFormat,
  selectedKeys: Array<keyof AnonymizeOptions>
): string {
  const options: AnonymizeOptions = { ...DEFAULT_OPTIONS };
  for (const key of selectedKeys) {
    options[key] = true;
  }

  if (selectedKeys.length > 0) {
    return anonymize(content, format, options);
  }
  return content;
}

export async function promptAndAnonymize(
  content: string,
  format: AgentFormat,
  flags?: AnonymizeFlags
): Promise<string> {
  // --no-anonymize: skip entirely
  if (flags?.noAnonymize) {
    if (process.stdout.isTTY) {
      p.log.info('No anonymization applied');
    }
    return content;
  }

  // --anonymize <keys>: apply specified options without prompting
  if (flags?.anonymize) {
    const selectedKeys = parseAnonymizeKeys(flags.anonymize);
    if (process.stdout.isTTY) {
      const spinner = p.spinner();
      spinner.start('Anonymizing session');
      const result = applyKeys(content, format, selectedKeys);
      spinner.stop('Session anonymized');
      return result;
    }
    return applyKeys(content, format, selectedKeys);
  }

  // No flags: non-TTY defaults to no anonymization
  if (!process.stdout.isTTY) {
    return content;
  }

  // TTY: interactive multiselect
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
    const anonymized = applyKeys(content, format, selectedKeys);
    spinner.stop('Session anonymized');
    return anonymized;
  }

  p.log.info('No anonymization applied');
  return content;
}
