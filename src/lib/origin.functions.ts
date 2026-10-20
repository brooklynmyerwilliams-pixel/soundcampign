import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requestOrigin } from "./social-sharing";

export const getRequestOrigin = createServerFn({ method: "GET" }).handler(() => requestOrigin(getRequest()));
