// react-app-env d: imports and dependencies
/// <reference types="react-scripts" />

declare module "*.css" {
  // Constants and helper functions
  const content: { [className: string]: string };
  export default content;
}
