import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { SiteAuth } from "../auth.js";

export interface GuestbookViewer {
  id: string;
  role: "user" | "super_admin";
}

export interface ViewerRequest extends Request {
  viewer?: GuestbookViewer;
}

export async function readViewer(auth: SiteAuth, req: Request) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return null;
  const role = (session.user as { role?: string }).role;
  const viewer: GuestbookViewer = {
    id: session.user.id,
    role: role === "super_admin" ? "super_admin" : "user",
  };
  return viewer;
}

export function createRequireUser(auth: SiteAuth) {
  return async (req: ViewerRequest, res: Response, next: NextFunction) => {
    try {
      const viewer = await readViewer(auth, req);
      if (!viewer) {
        res.status(401).json({ code: "UNAUTHENTICATED", message: "请先登录" });
        return;
      }
      req.viewer = viewer;
      next();
    } catch (error) {
      next(error);
    }
  };
}
