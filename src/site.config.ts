/**
 * 站点级自定义配置：页脚文案、页脚自定义 HTML、源码仓库地址。
 *
 * 这是构建期常量（打进 AppFooter 所在的那一块），改完要重新 `pnpm build` 再部署才生效。
 * 之所以不走 localStorage：页脚是「所有访客都要看到」的内容，本地存储只能改自己看到的那份。
 */
export interface SiteConfig {
  /** 站名，页脚里用 `{name}` 引用 */
  name: string
  /** 页脚首行，支持 `{year}`、`{name}` 两个占位符；留空字符串则整行不渲染 */
  footerLine: string
  /**
   * 页脚自定义 HTML：备案号、友链、统计代码等任意行内/块级标签都在这里写，
   * 同样支持 `{year}`、`{name}`。留空则不渲染。
   * ⚠️ 这段会被 v-html 原样插入 DOM，只允许填你自己维护的静态内容 ——
   * 接任何用户输入或远端数据都等于自造 XSS 通道。
   */
  footerHtml: string
  /** 源码仓库地址：只显示图标、不显示文字；留空字符串则整个链接不渲染 */
  github: string
  /** 固定版权年份；填 null 表示 `{year}` 取访问者本地的当前年份 */
  year: number | null
}

export const siteConfig: SiteConfig = {
  name: 'ToolBox',
  footerLine: '© {year} {name} · 纯前端工具箱，数据只留在你的浏览器里',
  // 写法示例（支持 <a> / <span> / <img> 等任意标签，链接会自动继承页脚的次要文字色）：
  // footerHtml: '备案号 <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">蜀ICP备XXXXXXXX号</a>',
  footerHtml: '',
  github: 'https://github.com/cunyu1943/ToolBox',
  year: null
}
