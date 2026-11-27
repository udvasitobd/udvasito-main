/**
 * Props that React Native Web supports but React Native's types leave out. `lang` marks text in the other
 * language (WCAG 3.1.2), e.g. the "বাংলা" label of the language toggle on an English page.
 */
import 'react-native';

declare module 'react-native' {
  interface TextProps {
    lang?: string;
  }
  interface ViewProps {
    lang?: string;
  }
  interface PressableProps {
    lang?: string;
  }
}
