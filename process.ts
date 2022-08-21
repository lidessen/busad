export function processCss(content: string) {
  return removeIntent(`
    const style = document.createElement('style')
    style.textContent = atob("${btoa(content)}")
    document.head.appendChild(style)
    `);
}

export function processAsset(path: string) {
  return removeIntent(`
    const path = "${path}"
    export default path
    `);
}

function removeIntent(text: string) {
  const rows = text.split(/\r?\n/);
  const indentLenght = /$\t+/.exec(rows[0])?.[0].length ?? 0;
  return rows.map((row) => row.substring(indentLenght, row.length)).join("\n");
}
