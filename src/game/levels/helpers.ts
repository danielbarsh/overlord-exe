import type { Verdict } from '../types';

/** Wraps a Main() body in the standard HackProtocol boilerplate */
export const main = (body: string) => `using System;

class HackProtocol
{
    static void Main()
    {
${body
  .split('\n')
  .map((l) => (l ? '        ' + l : ''))
  .join('\n')}
    }
}
`;

export function fail(message: string, failedTest = 0, extra: Partial<Verdict> = {}): Verdict {
  return { ok: false, failedTest, message, details: [message.replace(/[`*]/g, '')], mood: 'smug', ...extra };
}

/** Program with extra classes (e.g. a blueprint) above the HackProtocol class */
export const withClasses = (classes: string, body: string) => `using System;

${classes.trim()}

${main(body).replace('using System;\n\n', '')}`;
