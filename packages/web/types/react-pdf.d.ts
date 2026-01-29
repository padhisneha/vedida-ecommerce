declare module '@react-pdf/renderer' {
  import React from 'react';

  export interface DocumentProps {
    children?: React.ReactNode;
  }

  export interface PageProps {
    size?: string | { width: number; height: number };
    style?: any;
    children?: React.ReactNode;
  }

  export interface ViewProps {
    style?: any;
    children?: React.ReactNode;
  }

  export interface TextProps {
    style?: any;
    children?: React.ReactNode;
  }

  export interface ImageProps {
    src: string;
    style?: any;
    alt?: string;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;
  export const View: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const Image: React.FC<ImageProps>;
  export const StyleSheet: {
    create: <T>(styles: T) => T;
  };
}