/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DESIGN_ROUTE?: string;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
