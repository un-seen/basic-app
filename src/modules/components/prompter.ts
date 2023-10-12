type PromptData = {
  role: string;
  content: string;
};

function llamaV2Prompt(system_prompt: PromptData, messages: PromptData[]) {
  const B_INST = "[INST]";
  const E_INST = "[/INST]";
  const B_SYS = "<<SYS>>\n";
  const E_SYS = "\n<</SYS>>\n\n";
  const BOS = "<s>";
  const EOS = "</s>";
  messages = [system_prompt].concat(messages);
  messages = [
    {
      role: messages[1].role,
      content: B_SYS + messages[0].content + E_SYS + messages[1].content,
    },
  ].concat(messages.slice(2));

  const messagesList = messages
    .filter((_, index) => index % 2 === 0)
    .map((message, index) => {
      if (index === messages.length - 1) {
        return `${BOS}${B_INST} ${message.content.trim()} ${E_INST}`;
      } else {
        const answer = messages[index + 1];
        return `${BOS}${B_INST} ${message.content.trim()} ${E_INST} ${answer.content.trim()} ${EOS}`;
      }
    });

  return messagesList.join("");
}

export type { PromptData };

export { llamaV2Prompt };
