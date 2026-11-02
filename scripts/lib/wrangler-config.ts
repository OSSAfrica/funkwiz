import { parse, type ParseError } from "jsonc-parser";
import { z } from "zod";

const templateSchema = z
  .object({
    name: z.string().min(1),
    account_id: z.string().optional(),
    d1_databases: z
      .array(
        z
          .object({
            binding: z.string(),
            database_id: z.string().optional(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

export function parseWranglerTemplate(source: string) {
  const errors: ParseError[] = [];
  const value = parse(source, errors, { allowTrailingComma: true });
  const result = templateSchema.safeParse(value);
  if (errors.length || !result.success)
    throw new Error("Could not read the public Wrangler configuration.");
  return result.data;
}
