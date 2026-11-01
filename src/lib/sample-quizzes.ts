import type { Quiz } from "./quiz";

export const sampleQuizzes: Quiz[] = [
  {
    id: "example-space",
    title: "Out of this world",
    description: "Small questions. One giant leap for your class.",
    cover: "space",
    updatedAt: "2026-11-01T00:00:00Z",
    isExample: true,
    questions: [
      {
        id: "s1",
        prompt: "Which planet is known as the Red Planet?",
        answers: ["Venus", "Mars", "Jupiter", "Neptune"],
        correctIndex: 1,
        duration: 20,
      },
      {
        id: "s2",
        prompt: "What keeps the planets in orbit around the Sun?",
        answers: ["Magnetism", "Wind", "Gravity", "Electricity"],
        correctIndex: 2,
        duration: 30,
      },
      {
        id: "s3",
        prompt: "Which is the largest planet in our solar system?",
        answers: ["Earth", "Saturn", "Mars", "Jupiter"],
        correctIndex: 3,
        duration: 15,
      },
      {
        id: "s4",
        prompt: "What is the name of our galaxy?",
        answers: ["Andromeda", "The Milky Way", "Whirlpool", "Sombrero"],
        correctIndex: 1,
        duration: 20,
      },
    ],
  },
  {
    id: "example-nature",
    title: "The wild side",
    description: "Meet the wonderfully weird world of nature.",
    cover: "nature",
    updatedAt: "2026-11-01T00:00:00Z",
    isExample: true,
    questions: [
      {
        id: "n1",
        prompt:
          "What do plants absorb from the atmosphere during photosynthesis?",
        answers: ["Oxygen", "Hydrogen", "Carbon dioxide", "Helium"],
        correctIndex: 2,
        duration: 25,
      },
      {
        id: "n2",
        prompt: "Which animal is a mammal?",
        answers: ["Dolphin", "Shark", "Trout", "Octopus"],
        correctIndex: 0,
        duration: 15,
      },
      {
        id: "n3",
        prompt: "How many legs does an insect have?",
        answers: ["Four", "Six", "Eight", "Ten"],
        correctIndex: 1,
        duration: 15,
      },
    ],
  },
  {
    id: "example-world",
    title: "Around the world",
    description: "No passport needed. Just a curious mind.",
    cover: "world",
    updatedAt: "2026-11-01T00:00:00Z",
    isExample: true,
    questions: [
      {
        id: "w1",
        prompt: "On which continent is Ghana?",
        answers: ["Asia", "Europe", "Africa", "South America"],
        correctIndex: 2,
        duration: 15,
      },
      {
        id: "w2",
        prompt: "Which is the largest ocean?",
        answers: ["Atlantic", "Indian", "Arctic", "Pacific"],
        correctIndex: 3,
        duration: 20,
      },
      {
        id: "w3",
        prompt: "What is the capital of Japan?",
        answers: ["Seoul", "Tokyo", "Kyoto", "Beijing"],
        correctIndex: 1,
        duration: 20,
      },
    ],
  },
];
