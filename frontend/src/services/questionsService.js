import { apiClient } from '../lib/apiClient'

export const questionsService = {
  listByTopic: async (topicId) => {
    const res = await apiClient.get('/content/questions', { params: { topic_id: topicId } })
    return res.items || res.questions || res || []
  },
  create: (data) =>
    apiClient.post('/content/questions', {
      topic_id: Number(data.topicId),
      question_type: 'mcq',
      question_text: data.text,
      options: data.options,
      correct_answer: data.options[data.correctIndex],
      explanation: data.explanation || 'Explanation',
      hint: data.hint || 'Hint',
      difficulty: data.difficulty === 'easy' ? 1 : data.difficulty === 'hard' ? 3 : 2,
    }),
  update: (questionId, data) => apiClient.put(`/content/questions/${questionId}`, data),
  remove: (questionId) => apiClient.delete(`/content/questions/${questionId}`),
}
