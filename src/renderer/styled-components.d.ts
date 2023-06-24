import { Theme } from "./main";

declare module "styled-components" {
  interface DefaultTheme extends Theme { }
}