import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const url = process.env.PLATFORM_DATABASE_URL ?? "file:data/platform.db";

const client = createClient({ url });
export const db = drizzle(client, { schema });
