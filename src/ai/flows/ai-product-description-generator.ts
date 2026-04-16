'use server';
/**
 * @fileOverview A Genkit flow for generating attractive product descriptions based on keywords.
 *
 * - generateProductDescription - A function that handles the product description generation process.
 * - AIProductDescriptionGeneratorInput - The input type for the generateProductDescription function.
 * - AIProductDescriptionGeneratorOutput - The return type for the generateProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIProductDescriptionGeneratorInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  keywords: z
    .array(z.string())
    .describe('A list of keywords relevant to the product.'),
});
export type AIProductDescriptionGeneratorInput = z.infer<
  typeof AIProductDescriptionGeneratorInputSchema
>;

const AIProductDescriptionGeneratorOutputSchema = z.object({
  description: z
    .string()
    .describe('The generated attractive product description.'),
});
export type AIProductDescriptionGeneratorOutput = z.infer<
  typeof AIProductDescriptionGeneratorOutputSchema
>;

export async function generateProductDescription(
  input: AIProductDescriptionGeneratorInput
): Promise<AIProductDescriptionGeneratorOutput> {
  return generateProductDescriptionFlow(input);
}

const generateProductDescriptionPrompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: AIProductDescriptionGeneratorInputSchema},
  output: {schema: AIProductDescriptionGeneratorOutputSchema},
  prompt: `أنت خبير تسويق وكتابة إعلانية لمحل تصليح وبيع الهواتف النقالة "Express Phone". مهمتك هي صياغة وصف جذاب ومقنع لمنتج جديد بناءً على اسمه والكلمات المفتاحية المقدمة. يجب أن يكون الوصف باللغة العربية الفصحى، احترافيًا، ويسلط الضوء على مزايا المنتج لجذب العملاء.

اسم المنتج: {{{productName}}}
الكلمات المفتاحية: {{#each keywords}}
- {{{this}}}
{{/each}}

الوصف المقترح:`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: AIProductDescriptionGeneratorInputSchema,
    outputSchema: AIProductDescriptionGeneratorOutputSchema,
  },
  async input => {
    const {output} = await generateProductDescriptionPrompt(input);
    return output!;
  }
);
