/**
 * CMP-Markdown — renders a team-written page from src/content/generated (specs §1.3.5). External links open in
 * the browser; internal links (`/terms`) navigate inside the app.
 */
import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import type { Block, ContentDoc, Inline } from '@/lib/content';

import { Text } from './Text';

function renderInline(nodes: Inline[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}.${i}`;
    switch (n.t) {
      case 'text':
        return n.v;
      case 'strong':
        return (
          <Text key={key} variant="bodyStrong">
            {renderInline(n.c, key)}
          </Text>
        );
      case 'em':
        return (
          <Text key={key} style={{ fontStyle: 'italic' }}>
            {renderInline(n.c, key)}
          </Text>
        );
      case 'link':
        return (
          <Text
            key={key}
            tone="info"
            accessibilityRole="link"
            className="underline"
            onPress={() => (n.href.startsWith('/') ? router.push(n.href as never) : void Linking.openURL(n.href))}
          >
            {renderInline(n.c, key)}
          </Text>
        );
    }
  });
}

function BlockView({ block, index }: { block: Block; index: number }) {
  const key = `b${index}`;
  switch (block.t) {
    case 'heading':
      return (
        <Text variant={block.level === 2 ? 'heading' : 'bodyStrong'} accessibilityRole="header" className="mt-s2">
          {renderInline(block.c, key)}
        </Text>
      );
    case 'paragraph':
      return <Text>{renderInline(block.c, key)}</Text>;
    case 'list':
      return (
        <View accessibilityRole="list" className="gap-s2">
          {block.items.map((item, i) => (
            <View key={`${key}.${i}`} className="flex-row gap-s2">
              <Text aria-hidden className="min-w-6">
                {block.ordered ? `${block.start + i}.` : '•'}
              </Text>
              <Text className="flex-1">{renderInline(item, `${key}.${i}`)}</Text>
            </View>
          ))}
        </View>
      );
  }
}

export function Markdown({ doc }: { doc: ContentDoc }) {
  return (
    <View className="gap-s4">
      <Text variant="title" accessibilityRole="header">
        {doc.title}
      </Text>
      {doc.blocks.map((block, i) => (
        <BlockView key={i} block={block} index={i} />
      ))}
    </View>
  );
}
