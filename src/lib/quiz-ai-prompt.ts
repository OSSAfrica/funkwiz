import { importExample } from "./quiz";

/** A prompt for an external AI tool, not additional fields in the import JSON. */
export const quizAiPrompt = `Create a multiple-choice quiz that I can import into Funkwiz.

MY REQUEST — replace these bracketed values before generating:
Topic: [enter a topic, or write "use the attached/pasted document"]
Audience / level: [for example: ages 11–13, beginners]
Number of questions: [10; choose a number from 1 to 100]
Time per question: [20 seconds; choose whole seconds from 5 to 300, or vary by complexity]
Language: [English, or your preferred language]
Source material: [attach a document in this AI tool, or paste its text below; leave blank for a topic-based quiz]

CONTENT:
- When I provide a document, base the questions and correct answers on that material. Do not invent facts missing from it. If you cannot read the attachment or there is not enough material, ask me for readable text or a narrower request before generating.
- For a topic-based quiz, use well-established facts appropriate for the audience. Avoid uncertain or ambiguous claims.
- Write clear, varied questions with exactly one unambiguously correct answer and three plausible, distinct wrong choices. Vary the correct answer's position.
- Check that correctIndex points to the actual correct choice after ordering the answers.

REQUIRED FUNKWIZ FORMAT:
- Return one valid JSON object only: no Markdown fences, introductory text, comments, citations or trailing commas.
- title: a nonempty string, at most 120 characters.
- description: an optional string, at most 500 characters.
- cover: optional; if included use only "space", "nature", "world" or "confetti".
- questions: an array of 1–100 objects.
- Each question has prompt (nonempty, at most 1,000 characters), answers (exactly four nonempty strings, at most 240 characters each), correctIndex (an integer from 0 to 3), and duration (an integer from 5 to 300 seconds).
- correctIndex is ZERO-BASED: 0 = first answer, 1 = second, 2 = third, 3 = fourth.
- Use plain text, JSON numbers for numeric fields, and proper JSON string escaping. Do not add explanations, IDs, timestamps or report data.
- Keep the JSON comfortably below 500 KB. Validate the structure and answer keys before returning it.

FORMAT EXAMPLE — replace the sample content with my requested quiz:
${importExample}
`;
