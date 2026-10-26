import { resolve, sep } from "node:path";

const root = resolve("dist");
if (!(await Bun.file(resolve(root, "index.html")).exists())) {
  throw new Error("The production bundle is missing. Run just build first.");
}

const server = Bun.serve({
  hostname: "localhost",
  port: Number(process.env.PORT ?? 4173),
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!path.startsWith(root + sep)) return new Response("Not found", { status: 404 });
    const file = Bun.file(path);
    return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
  },
});

console.log(`Production preview: ${server.url}`);
