import * as p from '@clack/prompts';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';
import {
  ANONYMIZE_OPTION_LABELS,
  type AnonymizeOptions,
  anonymize,
  DEFAULT_OPTIONS,
} from '../anonymize.js';

const SELECT_ALL = '__select_all__' as const;

export async function promptAndAnonymize(
  content: string,
  format: AgentFormat
): Promise<string> {
  const optionKeys = Object.keys(ANONYMIZE_OPTION_LABELS) as Array<
    keyof AnonymizeOptions
  >;

  const anonChoices = await p.multiselect({
    message: 'Select anonymization options:',
    options: [
      { value: SELECT_ALL, label: 'Select all' },
      ...optionKeys.map(key => ({
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
    ? optionKeys
    : (anonChoices as Array<keyof AnonymizeOptions>);

  const options: AnonymizeOptions = { ...DEFAULT_OPTIONS };
  for (const key of selectedKeys) {
    options[key] = true;
  }

  if (selectedKeys.length > 0) {
    const spinner = p.spinner();
    spinner.start('Anonymizing session');
    const anonymized = anonymize(content, format, options);
    spinner.stop('Session anonymized');
    return anonymized;
  }

  p.log.info('No anonymization applied');
  return content;
}
