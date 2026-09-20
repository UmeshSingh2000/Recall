import { Fragment } from "react";
import { View, useColorScheme } from "react-native";
import { useMarkdown, type MarkedStyles } from "react-native-marked";
import { colors } from "../constants/theme";

const markedStyles: MarkedStyles = {
  text: {
    color: colors.charcoal,
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  h1: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 8,
  },
  h2: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
  },
  h3: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  strong: {
    fontWeight: "800",
    color: colors.ink,
  },
  em: {
    fontStyle: "italic",
  },
  link: {
    color: colors.green,
    textDecorationLine: "underline",
  },
  codespan: {
    backgroundColor: colors.canvas,
    color: colors.violet,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code: {
    backgroundColor: colors.canvas,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  codeText: {
    color: colors.charcoal,
    fontFamily: "monospace",
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: colors.canvas,
    borderLeftColor: colors.violet,
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 8,
  },
  list: {
    marginBottom: 8,
  },
  li: {
    color: colors.charcoal,
    fontSize: 14,
    lineHeight: 22,
  },
};

export function MarkdownContent({ content }: { content: string }) {
  const colorScheme = useColorScheme() ?? "light";
  const elements = useMarkdown(content, {
    colorScheme,
    styles: markedStyles,
    theme: {
      colors: {
        text: colors.charcoal,
        link: colors.green,
        code: colors.violet,
        border: colors.line,
      },
    },
  });

  return (
    <View>
      {elements.map((element, index) => (
        <Fragment key={`md-${index}`}>{element}</Fragment>
      ))}
    </View>
  );
}
