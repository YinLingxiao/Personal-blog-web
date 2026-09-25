import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { auth as Auth } from "../auth.js";

type AuthInstance = typeof Auth;

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
    role: "super_admin";
  };
}

export function createRequireSuperAdmin(auth: AuthInstance) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session) {
        res.status(401).json({ code: "UNAUTHENTICATED", message: "请先登录" });
        return;
      }

      const role = (session.user as typeof session.user & { role?: string }).role;
      if (role !== "super_admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "仅超管可执行此操作" });
        return;
      }

      req.admin = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: "super_admin",
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
