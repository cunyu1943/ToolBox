import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, markdownToHtml } from '~/utils/html-md'

describe('htmlToMarkdown', () => {
  it('标题与段落、加粗斜体', () => {
    expect(htmlToMarkdown('<h2>标题</h2><p>你好 <strong>世界</strong>，<em>呀</em></p>')).toBe(
      '## 标题\n\n你好 **世界**，*呀*'
    )
  })

  it('链接、图片、行内代码与实体', () => {
    const md = htmlToMarkdown(
      '<a href="https://a.b">A</a> <img src="/i.png" alt="图"> <code>a &lt; b</code> &amp; '
    )
    expect(md).toBe('[A](https://a.b) ![图](/i.png) `a < b` &')
  })

  it('无序/有序列表与换行', () => {
    expect(htmlToMarkdown('<ul><li>甲</li><li>乙</li></ul>')).toBe('- 甲\n- 乙')
    expect(htmlToMarkdown('<ol><li>第一</li><li>第二</li></ol>')).toBe('1. 第一\n2. 第二')
    expect(htmlToMarkdown('line1<br>line2')).toBe('line1\nline2')
  })

  it('引用、hr 与代码块', () => {
    expect(htmlToMarkdown('<blockquote>quoted</blockquote>')).toBe('> quoted')
    expect(htmlToMarkdown('a<hr>b')).toBe('a\n---\nb')
    expect(
      htmlToMarkdown('<pre><code>let a = 1\nlet b = 2</code></pre>')
    ).toBe('```\nlet a = 1\nlet b = 2\n```')
  })
})

describe('markdownToHtml', () => {
  it('标题/段落/行内样式', () => {
    expect(markdownToHtml('# Hi\n\n普通 **粗** *斜* `c`')).toBe(
      '<h1>Hi</h1>\n<p>普通 <strong>粗</strong> <em>斜</em> <code>c</code></p>'
    )
  })

  it('链接图片与 HTML 转义', () => {
    expect(markdownToHtml('[x](https://a.b) and a < b & c')).toBe(
      '<p><a href="https://a.b">x</a> and a &lt; b &amp; c</p>'
    )
  })

  it('列表/引用/hr/代码块', () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(markdownToHtml('1. 甲\n2. 乙')).toBe('<ol><li>甲</li><li>乙</li></ol>')
    expect(markdownToHtml('> 引用一行')).toBe('<blockquote><p>引用一行</p></blockquote>')
    expect(markdownToHtml('a\n\n---\n\nb')).toBe('<p>a</p>\n<hr>\n<p>b</p>')
    expect(markdownToHtml('```\nif (a < b) {}\n```')).toBe(
      '<pre><code>if (a &lt; b) {}</code></pre>'
    )
  })

  it('段内换行转 <br>', () => {
    expect(markdownToHtml('第一行\n第二行')).toBe('<p>第一行<br>第二行</p>')
  })
})

describe('互转往返', () => {
  it('markdown → html → markdown 稳定', () => {
    const md = '## 标题\n\n**粗** 和 [链接](https://x.y)\n\n- 一\n- 二'
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md)
  })
})
