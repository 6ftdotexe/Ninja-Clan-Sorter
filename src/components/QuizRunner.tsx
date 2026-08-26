import { useState } from 'react';
import type { Question, TestDefinition, TestLength, TestResult } from '../types/quiz';
import { scoreAnswers, selectQuestions } from '../engine/scoring';

const lengthInfo: Record<TestLength, { label: string; detail: string; pace: string }> = {
  short: { label: 'Short', detail: 'Quick read', pace: '~2–4 min' },
  medium: { label: 'Medium', detail: 'Balanced accuracy', pace: '~5–8 min' },
  long: { label: 'Long', detail: 'Deepest result', pace: '~8–15 min' },
};

export function QuizRunner({ test, onComplete, onExit }: { test: TestDefinition; onComplete: (r: TestResult) => void; onExit: () => void }) {
  const [length, setLength] = useState<TestLength | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  const lengths = test.lengths ?? {
    short: Math.max(4, Math.ceil(test.questionCount * 0.45)),
    medium: Math.max(6, Math.ceil(test.questionCount * 0.72)),
    long: test.questionCount,
  };

  const start = (choice: TestLength) => {
    setLength(choice);
    setQuestions(selectQuestions(test, lengths[choice]));
    setIndex(0);
    setAnswers([]);
    setDirection('next');
  };

  if (!length) {
    return <div className="screen quiz length-select">
      <div className="quiz-head"><button className="back" onClick={onExit}>← Archive</button><span>Choose test depth</span></div>
      <div className="length-intro">
        <span className="eyebrow">{test.label}</span>
        <h2>How deep do you want to go?</h2>
        <p>{test.description}</p>
      </div>
      <div className="length-grid">
        {(['short', 'medium', 'long'] as TestLength[]).map((choice) => {
          const info = lengthInfo[choice];
          return <button key={choice} className={`length-card ${choice === 'medium' ? 'recommended' : ''}`} onClick={() => start(choice)}>
            {choice === 'medium' && <small>RECOMMENDED</small>}
            <strong>{info.label}</strong>
            <b>{lengths[choice]} questions</b>
            <span>{info.detail}</span>
            <em>{info.pace}</em>
          </button>;
        })}
      </div>
      <p className="length-note">Every mode uses a randomized set of distinct questions. Longer tests improve score stability and secondary-match accuracy.</p>
    </div>;
  }

  const q = questions[index];
  const choose = (pick: number) => {
    const next = [...answers];
    next[index] = pick;
    if (index === questions.length - 1) {
      const result = scoreAnswers(test, questions, next);
      result.meta = { ...(result.meta ?? {}), testLength: length, questionCount: questions.length };
      onComplete(result);
      return;
    }
    setAnswers(next);
    setDirection('next');
    setIndex(index + 1);
  };
  const back = () => {
    if (!index) {
      setLength(null);
      setQuestions([]);
      setAnswers([]);
      return;
    }
    setDirection('back');
    setIndex(index - 1);
  };

  return <div className="screen quiz"><div className="quiz-head"><button className="back" onClick={back}>← {index ? 'Back' : 'Length'}</button><span>{lengthInfo[length].label} · {index + 1} / {questions.length}</span></div><div className="progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><div key={q.id} className={`question-stage ${direction}`}><span className="eyebrow">{test.label} · {q.theme}</span><h2 className="question">{q.prompt}</h2><div className="answers">{q.answers.map((ans, i) => <button key={`${q.id}-${i}`} className={`answer ${answers[index] === i ? 'selected' : ''}`} onClick={() => choose(i)}><small>{String.fromCharCode(65 + i)}</small>{ans.text}</button>)}</div></div></div>;
}
