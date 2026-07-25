import fs from "fs"
import path from "path"

export default function RootPage() {
  const indexPath = path.join(process.cwd(), "public", "index.html")
  const navPath = path.join(process.cwd(), "public", "nav.html")
  const footerPath = path.join(process.cwd(), "public", "footer.html")

  let html = fs.readFileSync(indexPath, "utf8")
  const navHtml = fs.readFileSync(navPath, "utf8")
  const footerHtml = fs.readFileSync(footerPath, "utf8")

  html = html.replace("<div data-include='nav.html'></div>", navHtml)
  html = html.replace("<div data-include=\"nav.html\"></div>", navHtml)
  html = html.replace("<div data-include='footer.html'></div>", footerHtml)
  html = html.replace("<div data-include=\"footer.html\"></div>", footerHtml)

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  )
}
