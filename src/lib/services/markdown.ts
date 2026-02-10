import { Marked } from 'marked';
import DOMPurify from 'dompurify';

const marked = new Marked({
  gfm: true,
  breaks: true,
});

const renderer = {
  link({ href, text }: { href: string; text: string }): string {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  },
  code({ text, lang }: { text: string; lang?: string }): string {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${text}</code></pre>`;
  },
};

marked.use({ renderer });

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
  'img',
  'span',
  'div',
  'sub',
  'sup',
];

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'type',
  'checked',
  'disabled',
  'alt',
  'src',
];

const cache = new Map<string, string>();
const MAX_CACHE = 200;

export function renderMarkdown(content: string): string {
  const cached = cache.get(content);
  if (cached) return cached;

  const raw = marked.parse(content) as string;
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value!;
    cache.delete(first);
  }
  cache.set(content, clean);

  return clean;
}
