/**
 * HTML ⇄ Markdown 常用子集双向转换（纯字符串实现，不依赖 DOM）。
 * 支持：h1-h6、p、br、hr、strong/b、em/i、a、img、code、pre、blockquote、ul/ol/li。
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isNaN(code) ? m : String.fromCodePoint(code)
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isNaN(code) ? m : String.fromCodePoint(code)
    }
    const named = ENTITIES[body.toLowerCase()]
    return named ?? m
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ---------- HTML → Markdown ---------- */

export function htmlToMarkdown(html: string): string {
  let s = html.replace(/\r\n?/g, '\n').trim()

  // pre/code 先行，保护内部内容不被后续规则破坏
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/^\n|\n$/g, '')
    return `\n\`\`\`\n${code}\n\`\`\`\n`
  })
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) =>
    '`' + decodeEntities(inner.replace(/<[^>]+>/g, '')).trim() + '`'
  )

  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, body: string) =>
    `\n${'#'.repeat(Number(n))} ${inlineToMd(body)}\n`
  )
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, body: string) => {
    const text = inlineToMd(body).trim()
    return `\n${text.split('\n').map(l => `> ${l}`).join('\n')}\n`
  })
  s = s.replace(/<hr\s*\/?>/gi, '\n---\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')

  // 列表：展开每个 li，按外层列表类型
  s = s.replace(/<[ou]l[^>]*>([\s\S]*?)<\/[ou]l>/gi, (list: string, _body: string) => {
    const ordered = /^<ol/i.test(list)
    let i = 0
    return (
      '\n' +
      _body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, item: string) => {
        i++
        return `${ordered ? `${i}. ` : '- '}${inlineToMd(item).trim()}\n`
      }) +
      '\n'
    )
  })

  s = s.replace(/<\/?(p|div|span|body|html|main|article|section)[^>]*>/gi, '\n')
  s = inlineToMd(s)

  // 收尾：合并空行
  return s
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 仅处理行内标签（b/strong/i/em/a/img）并清理剩余标签 */
function inlineToMd(s: string): string {
  let out = s
  out = out.replace(/<img[^>]*>/gi, m => {
    const src = /src=["']([^"']*)["']/i.exec(m)?.[1] ?? ''
    const alt = /alt=["']([^"']*)["']/i.exec(m)?.[1] ?? ''
    return `![${alt}](${src})`
  })
  out = out.replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, body: string) => {
    const text = body.replace(/<[^>]+>/g, '')
    return text === href ? `<${href}>` : `[${text.trim()}](${href})`
  })
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t: string, body: string) => {
    const inner = body.replace(/<[^>]+>/g, '')
    return inner.trim() === '' ? '' : `**${inner.trim()}**`
  })
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t: string, body: string) => {
    const inner = body.replace(/<[^>]+>/g, '')
    return inner.trim() === '' ? '' : `*${inner.trim()}*`
  })
  out = out.replace(/<[^>]+>/g, '')
  return decodeEntities(out)
}

/* ---------- Markdown → HTML ---------- */

function mdInline(s: string): string {
  let out = escapeHtml(s)
  out = out.replace(/`([^`]+)`/g, (_m, c: string) => `<code>${c}</code>`)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => `<img src="${src}" alt="${alt}">`)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => `<a href="${href}">${text}</a>`)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
  return out
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let para: string[] = []
  let i = 0

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${para.map(mdInline).join('<br>')}</p>`)
      para = []
    }
  }

  while (i < lines.length) {
    const line = lines[i]!

    const fence = /^```(.*)$/.exec(line)
    if (fence) {
      flushPara()
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        code.push(lines[i]!)
        i++
      }
      i++ // 跳过结尾 ```
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushPara()
      const level = heading[1]!.length
      html.push(`<h${level}>${mdInline(heading[2]!)}</h${level}>`)
      i++
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara()
      html.push('<hr>')
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      flushPara()
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quote.push(lines[i]!.replace(/^>\s?/, ''))
        i++
      }
      html.push(`<blockquote>${markdownToHtml(quote.join('\n'))}</blockquote>`)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flushPara()
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (
        i < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[i]!) : /^\s*[-*+]\s+/.test(lines[i]!))
      ) {
        items.push(mdInline(lines[i]!.replace(/^\s*(?:[-*+]|\d+\.|)\s+/, '')))
        i++
      }
      const tag = ordered ? 'ol' : 'ul'
      html.push(`<${tag}>${items.map(x => `<li>${x}</li>`).join('')}</${tag}>`)
      continue
    }

    if (line.trim() === '') {
      flushPara()
      i++
      continue
    }

    para.push(line)
    i++
  }
  flushPara()
  return html.join('\n')
}
