import path from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { ContentPublisher } from "../content/content-publisher.js";
import type { ContentTarget } from "../content/content-store.js";
import fs from "node:fs/promises";
import { buildNoteCatalog } from "../../../shared/content/note-catalog.mjs";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);

export function createPublicContentRouter(publisher: ContentPublisher) {
  const router = Router();

  async function sendPublished(req: Request, res: Response, next: NextFunction, filename: string) {
    const target = req.params.target as ContentTarget;
    if (target !== "blog" && target !== "note") {
      res.sendStatus(404);
      return;
    }
    try {
      const directory = await publisher.directory(target);
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(filename, { root: directory }, (error) => {
        if (error && !res.headersSent) {
          if ("status" in error && error.status === 404) res.sendStatus(404);
          else next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  }

  router.get("/:target/index.json", (req, res, next) => {
    void sendPublished(req, res, next, "index.json");
  });
  router.get("/:target/latest.json", (req, res, next) => {
    void sendPublished(req, res, next, "latest.json");
  });
  router.get("/note/catalog.json", async (_req, res, next) => {
    try {
      const directory = await publisher.directory("note");
      const index = JSON.parse(await fs.readFile(path.join(directory, "index.json"), "utf8"));
      res.setHeader("Cache-Control", "no-store");
      res.json(buildNoteCatalog(index));
    } catch (error) {
      next(error);
    }
  });
  router.get("/:target/rss.xml", (req, res, next) => {
    void sendPublished(req, res, next, "rss.xml");
  });
  router.get("/:target/posts/:slug/:filename", async (req, res, next) => {
    const target = req.params.target as ContentTarget;
    const slug = String(req.params.slug);
    const filename = String(req.params.filename);
    if ((target !== "blog" && target !== "note") ||
      !slug || slug.startsWith(".") || /[\u0000-\u001f\u007f/\\:]/.test(slug) || path.isAbsolute(slug) ||
      filename.startsWith(".") || filename.includes("/") || filename.includes("\\") ||
      !imageExtensions.has(path.extname(filename).toLowerCase())) {
      res.sendStatus(404);
      return;
    }
    try {
      const directory = await publisher.directory(target);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.sendFile(filename, { root: path.join(directory, "posts", slug) }, (error) => {
        if (error && !res.headersSent) {
          if ("status" in error && error.status === 404) res.sendStatus(404);
          else next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
