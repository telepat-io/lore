import React from 'react';
import { Box, Text } from 'ink';

export function CompileView(): React.ReactElement {
  // TODO: Streaming LLM token output + ProgressBar (N of M articles done)
  // TODO: Call compile() and display streaming progress

  return (
    <Box flexDirection="column">
      <Text bold>Compile</Text>
      <Text color="gray">LLM compilation progress will appear here.</Text>
    </Box>
  );
}
