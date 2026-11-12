export const idleMessages = ['Thử nhớ từ tiếng Anh xem nào!', 'Nhập đáp án đi nè!']
export const typingMessages = ['Tập trung nha 👀', 'Bạn nhớ ra chưa?']
export const correctMessages = ['Chính xác!', 'Giỏi lắm!', 'Đúng rồi đó 🎉']
export const incorrectMessages = ['Oops, chưa đúng rồi!', 'Thử lại nha!', 'Không sao, làm lại được mà!']

export const mascotMessages = {
  idle: idleMessages,
  typing: typingMessages,
  correct: correctMessages,
  incorrect: incorrectMessages,
}
export type MascotState = keyof typeof mascotMessages

/** Pick on an answer check, never during render or when typing. */
export function pickMascotMessage(state: 'correct' | 'incorrect'): string {
  const messages = mascotMessages[state]
  return messages[Math.floor(Math.random() * messages.length)]
}
