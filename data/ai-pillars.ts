export const AI_PILLARS = [
  {
    title: 'Machine Learning',
    description:
      'Machine learning finds patterns in examples instead of relying only on hand-written rules. During training, a model adjusts its parameters to improve at a task, such as predicting demand or recommending music. It then uses those patterns on new inputs. Useful models need representative data and careful evaluation: learning a pattern does not guarantee that a prediction is fair, accurate, or reliable in a new setting.',
  },
  {
    title: 'Natural Language Processing',
    description:
      'Natural language processing helps computers work with human language, including text and speech. Applications include translation, search, summarization, and voice assistants. Many modern systems learn statistical relationships between words and their context to interpret or generate language. Fluent output can still contain mistakes or miss cultural context, so important claims need checking and sensitive tasks benefit from human review.',
  },
  {
    title: 'Computer Vision',
    description:
      'Computer vision extracts useful information from images and video. A system might identify objects, locate a defect on a production line, or help analyze a medical scan. Models often learn from labeled visual examples, connecting image patterns to categories or positions. Lighting, camera angles, and unfamiliar scenes can change their performance. Visual recognition is a prediction based on data, rather than a complete understanding of a scene.',
  },
  {
    title: 'Robotics',
    description:
      'Robotics combines sensing, planning, and physical action. Robots use sensors to observe their surroundings, software to choose actions, and motors or other actuators to carry them out. AI can help a robot recognize objects, plan a route, or adapt its movements. Examples include warehouse robots and assistive devices. Because actions affect the physical world, safe operation requires constraints, testing, and ways for people to intervene. Not every robot uses AI.',
  },
] as const;
