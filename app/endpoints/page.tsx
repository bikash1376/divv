import { readdirSync } from "node:fs";
import path from "node:path";

// Walks app/ for page files so the list stays in sync as routes are added.
// Route groups like (marketing) don't add a URL segment; private (_x) and
// dynamic ([x]) folders are skipped since they can't be linked directly.
function findRoutes(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && /^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) {
      routes.push("/" + segments.join("/"));
    } else if (entry.isDirectory()) {
      const name = entry.name;
      if (name.startsWith("_") || name.startsWith("[") || name.startsWith("@")) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      routes.push(...findRoutes(path.join(dir, name), isGroup ? segments : [...segments, name]));
    }
  }
  return routes;
}

const linkStyle = { color: "#0000EE", textDecoration: "underline" } as const;

export default function EndpointsPage() {
  const routes = findRoutes(path.join(process.cwd(), "app")).sort();
  return (
    <ul style={{ padding: 16, listStyle: "disc inside" }}>
      {routes.map((route) => (
        <li key={route}>
          <a href={route} style={linkStyle}>
            {route}
          </a>
        </li>
      ))}
    </ul>
  );
}
