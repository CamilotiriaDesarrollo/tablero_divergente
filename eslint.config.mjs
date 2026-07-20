import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Guarda de seguridad (BLUEPRINT-BOT sec. 6): el cliente service_role
    // (lib/supabase/admin) bypassa RLS. Solo el canal del bot puede importarlo;
    // jamas la web, o esta operaria con permisos totales sin filtro de usuario.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "**/lib/supabase/admin"],
              message:
                "lib/supabase/admin (service_role) solo puede importarse desde lib/bot/** o app/api/telegram/**. Bypassa RLS: nunca desde la web.",
            },
          ],
        },
      ],
    },
  },
  {
    // El canal del bot SI puede usar el cliente admin.
    files: ["lib/bot/**", "app/api/telegram/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
