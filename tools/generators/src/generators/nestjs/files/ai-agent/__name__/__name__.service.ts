import { ConfigService } from '@nestjs/config';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getChatModel } from '@openthrottle/nestjs-langchain';
import { HumanMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { tool } from 'langchain';
import { z } from 'zod';
// import { LanguageModelLike } from '@langchain/core/language_models/base';

@Injectable()
export class <%= namePascal %>Service {
  // private llm: LanguageModelLike;
  private llm: any;
  private name = '<%= name %>';

  // Inject and initialize as needed
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const projectId = this.configService.get<string>('googleCloud.projectId');

    this.llm = getChatModel({
      model: 'llama3.2',
      projectId: projectId || '__UNKNOWN__',
      provider: 'Ollama',
      temperature: 0,
      // verbose: true,
    })
  }

  getAgent() {
    return createReactAgent({
      llm: this.llm,
      name: this.name,
      prompt: `You are an orchestrator agent that coordinates the work of other agents.`,
      tools: [
        // use the github tools alongside our filesystem knowledge
        this.exampleTool(),
      ],
    });
  }

  async invoke(input: string) {
    const agent = this.getAgent();
    const message = new HumanMessage({ content: input });

    const response = await agent.invoke({ messages: [message] });

    return response;
  }

  exampleTool() {
    interface Input {
      city: string
    }

    return tool(
      async (input: Input) => {
        const { city } = input;

        // TODO: Fill in the actual tool calls
        return `It's always sunny in ${city}!`;
      },
      {
        description: 'Get weather for a given city.',
        name: 'getWeather',
        schema: z.object({
          city: z.string().describe('The city to get the weather for'),
        }),
      },
    );
  }
}
