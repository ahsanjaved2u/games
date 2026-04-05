'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── FAQ Data ── */
const faqSections = [
  {
    title: '🎮 Getting Started',
    icon: '🚀',
    questions: [
      {
        q: 'What is GameVesta?',
        a: 'GameVesta is a real-money gaming platform where you can play browser-based HTML5 games, earn cash rewards, and compete with other players for prize pools — all in PKR (Pakistani Rupees).',
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" in the top navigation bar. Enter your name, email, and a password (minimum 6 characters). Confirm your password and click "Create Account". You\'ll be logged in automatically.',
      },
      {
        q: 'Is it free to join?',
        a: 'Yes! Creating an account is completely free. Many games are also free to play. Some games have optional entry fees or per-attempt costs for higher earning potential.',
      },
      {
        q: 'What devices can I play on?',
        a: 'GameVesta works on any modern browser — desktop, laptop, tablet, or mobile phone. Games are fully responsive and support both mouse/keyboard and touch controls.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'Currently, please contact the platform administrator to reset your password. Password reset via email is planned for a future update.',
      },
    ],
  },
  {
    title: '🕹️ Games & Gameplay',
    icon: '🎯',
    questions: [
      {
        q: 'What types of games are available?',
        a: 'There are four types:\n\n• **Free Rewarding** — Play for free, earn PKR based on your score.\n• **Paid Rewarding** — Pay a small fee per attempt, earn higher PKR rewards.\n• **Free Competitive** — Join competitions for free, win prizes from a fixed pool.\n• **Paid Competitive** — Pay a one-time entry fee to join a competition with larger prizes.',
      },
      {
        q: 'How do I start playing a game?',
        a: 'Browse games on the Home or Games page, click on a game card, read the instructions on the pre-game screen, then click "Start Game" (free) or "Pay & Play" (paid). The game loads in fullscreen.',
      },
      {
        q: 'Can I play a game multiple times?',
        a: 'Yes! You can play unlimited times. For rewarding games, only your **best score** in each reward period counts toward earnings. For competitive games, only your **best score** counts for the final ranking.',
      },
      {
        q: 'What is a reward period?',
        a: 'Rewarding games have a repeating cycle (e.g., every 30 minutes or every day). Your best score resets at the start of each new period, giving you fresh chances to earn. A countdown timer on the game card shows when the current period ends.',
      },
      {
        q: 'What happens when a game has a time limit?',
        a: 'If a game has a time limit, a timer appears in the HUD bar at the top. When time runs out, the game ends automatically and your score is submitted.',
      },
      {
        q: 'Can I pause the game?',
        a: 'Yes. Click the pause icon (⏸) in the HUD bar at the top of the game. Click again to resume. The timer pauses as well.',
      },
      {
        q: 'What do the badges on game cards mean?',
        a: '• **FREE** — No cost to play.\n• **PKR X / attempt** — Per-play cost (paid rewarding game).\n• **Entry: PKR X** — One-time contest entry fee (paid competitive).\n• **🏆** — Competitive game with a prize pool.\n• **Popular**, **New**, **Hot** — Admin-assigned tags to highlight games.',
      },
      {
        q: 'What happens when a competition ends?',
        a: 'When the competition\'s scheduled end time is reached, the system automatically ranks all players by their best score. Prize money is credited to the top players\' wallets. The game is then unpublished.',
      },
    ],
  },
  {
    title: '📊 Points, Scores & Rankings',
    icon: '🏅',
    questions: [
      {
        q: 'What is the difference between Points and Score?',
        a: '**Points** are what you earn during gameplay (e.g., popping bubbles, hitting targets). **Score** is calculated from your points with a time bonus — finishing faster gives a higher score. Score is what determines your ranking and PKR earnings.',
      },
      {
        q: 'How is my score calculated?',
        a: 'Score = Points × (1 + max(0, 120 − time) / 600). Finishing under 120 seconds gives you a bonus of up to +20%. After 120 seconds, there\'s no bonus — score equals points.',
      },
      {
        q: 'Why didn\'t my score update after playing again?',
        a: 'The system uses a **best-score** model. If your new score is lower than your existing best for the current period/contest, only your play count is incremented — the score stays at your previous best.',
      },
      {
        q: 'How do leaderboards work?',
        a: 'Leaderboards show the best score per player for a specific game, contest, or reward period. Players are ranked from highest to lowest score. The top 3 get gold 🥇, silver 🥈, and bronze 🥉 badges.',
      },
      {
        q: 'Can I see my rank in a game?',
        a: 'Yes! After each play, your rank is shown on the game-over screen. You can also check the Leaderboard page to see your position across all games and contests.',
      },
      {
        q: 'Where can I see all my past scores?',
        a: 'Go to the **Leaderboard** page and select "My Entries" to see your performance across all games. Or visit your **Profile** page for a detailed breakdown including per-contest and per-period stats.',
      },
    ],
  },
  {
    title: '💰 Money, Earnings & Wallet',
    icon: '🏦',
    questions: [
      {
        q: 'How do I earn money?',
        a: 'In **rewarding games**: your score is converted to PKR using a conversion rate (e.g., 10 points = PKR 1). Money is auto-credited to your wallet.\n\nIn **competitive games**: fixed prizes are awarded to the top-ranked players when the competition ends.',
      },
      {
        q: 'What is the conversion rate?',
        a: 'The conversion rate determines how many points equal PKR 1. For example, if the conversion rate is 10, scoring 150 points earns you PKR 15.00. Each game can have a different conversion rate.',
      },
      {
        q: 'When does money appear in my wallet?',
        a: 'For **rewarding games**, money is credited instantly when you set a new best score. If you beat your best, only the difference is added.\n\nFor **competitive games**, prizes are credited when the competition ends and the system distributes rewards to top players.',
      },
      {
        q: 'Where can I see my wallet balance?',
        a: 'Your balance is always visible in the **navigation bar** at the top (green badge showing "💰 PKR X"). Click it to go to the full Wallet page with your transaction history.',
      },
      {
        q: 'What is a transaction?',
        a: 'A transaction is any movement of money in your wallet:\n\n• **Credit** (green ↗) — Money added (game rewards, competition prizes, admin credit).\n• **Debit** (red ↙) — Money deducted (attempt costs, entry fees, admin debit).\n• **Withdrawal** (yellow ↻) — Your request to cash out.',
      },
      {
        q: 'Does my balance update automatically?',
        a: 'Yes. The balance in the navbar refreshes every 30 seconds. On the Wallet page, you can see real-time transaction history.',
      },
      {
        q: 'What happens if I don\'t have enough balance to play a paid game?',
        a: 'You\'ll see an "Insufficient Balance" warning with a "Top Up Wallet" button that takes you to the Wallet page. You need to have funds credited (by winning games or admin credit) before playing paid games.',
      },
    ],
  },
  {
    title: '🏧 Withdrawals & Payments',
    icon: '💳',
    questions: [
      {
        q: 'How do I withdraw money?',
        a: '1. Go to the **Wallet** page.\n2. Enter the amount you want to withdraw.\n3. Click "Proceed to Payment Details".\n4. Choose your payment method: **Bank Transfer**, **EasyPaisa**, or **JazzCash**.\n5. Enter your account details and confirm.\n6. The amount is deducted immediately; an admin will approve the request.',
      },
      {
        q: 'What payment methods are supported?',
        a: '• **Bank Transfer** — Select from 27+ Pakistani banks, provide account title and number.\n• **EasyPaisa** — Provide account title and phone number.\n• **JazzCash** — Provide account title and phone number.',
      },
      {
        q: 'How long does withdrawal take?',
        a: 'The withdrawal request is sent to the admin immediately. Processing time depends on the admin\'s review. You\'ll receive an **email notification** when your withdrawal is approved or rejected.',
      },
      {
        q: 'What if my withdrawal is rejected?',
        a: 'If rejected, the full amount is **automatically refunded** to your wallet. You\'ll receive an email notification explaining the rejection.',
      },
      {
        q: 'Is there a minimum withdrawal amount?',
        a: 'The minimum withdrawal is PKR 0.01. There\'s no maximum limit — you can withdraw your full balance.',
      },
      {
        q: 'Can I cancel a pending withdrawal?',
        a: 'Currently, once a withdrawal is submitted, it\'s processed by the admin. Contact the administrator if you need to cancel.',
      },
    ],
  },
  {
    title: '🏆 Competitions & Prizes',
    icon: '🎖️',
    questions: [
      {
        q: 'How do competitions work?',
        a: 'Competitions run between a scheduled start and end date. During that window, all players play the same game and compete for the best score. When the competition ends, prizes go to the top-ranked players.',
      },
      {
        q: 'How are prizes distributed?',
        a: 'Prizes are fixed amounts set by the admin (e.g., 1st: PKR 500, 2nd: PKR 300, 3rd: PKR 100). When the competition ends, the system automatically credits the winners\' wallets.',
      },
      {
        q: 'What is the minimum player threshold?',
        a: 'Some competitions require a minimum number of players. If the threshold isn\'t met by the end, prizes are **not distributed**. If set to 0, prizes are always distributed regardless of player count.',
      },
      {
        q: 'Can I enter a competition after it has started?',
        a: 'Yes! You can join anytime while the competition is running (between scheduleStart and scheduleEnd). You\'ll just have less time to improve your score.',
      },
      {
        q: 'Do I need to pay an entry fee for every competition?',
        a: 'Only paid competitive games require an entry fee. Free competitive games let you join at no cost. The entry fee is a **one-time payment** per contest — play unlimited times after that.',
      },
      {
        q: 'Where can I see competition results?',
        a: 'Go to the **Leaderboard** page and select the specific game. You can switch between past contest rounds to see final rankings and winners.',
      },
    ],
  },
  {
    title: '👤 Account & Profile',
    icon: '⚙️',
    questions: [
      {
        q: 'How do I update my profile?',
        a: 'Go to the **Profile** page (click your avatar in the navbar → Profile). You can update your name, email, and avatar.',
      },
      {
        q: 'Can I see my complete gaming history?',
        a: 'Yes! Your **Profile** page shows detailed stats: total plays, unique games played, financial summary (won, redeemed, balance), and per-game breakdowns with contest-level detail.',
      },
      {
        q: 'What does the redemption rate mean?',
        a: 'Redemption rate = (total redeemed ÷ total won) × 100%. It shows what percentage of your earnings you\'ve withdrawn or had paid out.',
      },
      {
        q: 'How do I log out?',
        a: 'Click your avatar in the top-right corner, then click "🚪 Logout" from the dropdown menu.',
      },
    ],
  },
  {
    title: '🤝 Referral Program',
    icon: '🎁',
    questions: [
      {
        q: 'What is the Referral Program?',
        a: 'The Referral Program lets you invite friends to GameVesta. When they sign up using your unique referral link, verify their email, and start playing — you earn a **bonus percentage** on their game rewards for a limited time.',
      },
      {
        q: 'How do I get my referral link?',
        a: 'Go to the **Referrals** page (click "🤝 Referrals" in the navigation menu). Your unique referral link and code are displayed at the top. You can copy the link or share it directly.',
      },
      {
        q: 'How much do I earn from referrals?',
        a: 'You earn a percentage of your referred friend\'s game rewards. For example, if the bonus is 10% and your friend earns PKR 100 from a game, you get PKR 10 as a referral bonus. The exact percentage is set by the platform admin.',
      },
      {
        q: 'How long do referral rewards last?',
        a: 'Referral rewards are active for a limited period (e.g., 30 days) starting from when your friend verifies their email. After the period expires, you no longer earn bonuses from that referral.',
      },
      {
        q: 'Is there a limit to how many people I can refer?',
        a: 'Yes, there is a maximum number of referrals per user (set by the admin). Check your Referrals page to see your current count and limit.',
      },
      {
        q: 'When does a referral become active?',
        a: 'A referral becomes **active** once your friend completes email verification. Until then, the referral stays in "pending" status and no bonuses are earned.',
      },
      {
        q: 'What happens if a referral is flagged?',
        a: 'If the system detects suspicious activity (e.g., the referrer and referee sharing the same IP address), the referral is automatically **flagged** for admin review. Flagged referrals do not earn bonuses until approved.',
      },
      {
        q: 'Where do referral bonuses go?',
        a: 'Referral bonuses are automatically credited to your **wallet** as regular credits. You can see them in your transaction history and withdraw them like any other earnings.',
      },
      {
        q: 'Can I refer myself with another account?',
        a: 'No. Creating multiple accounts for self-referral is against our Terms of Service. Such activity is automatically detected and may result in account suspension.',
      },
    ],
  },
  {
    title: '❓ General & Troubleshooting',
    icon: '🔧',
    questions: [
      {
        q: 'The game is not loading. What should I do?',
        a: 'Try these steps:\n1. Refresh the page.\n2. Clear your browser cache.\n3. Make sure JavaScript is enabled.\n4. Try a different browser (Chrome, Firefox, Edge recommended).\n5. Check your internet connection.',
      },
      {
        q: 'My score wasn\'t saved. Why?',
        a: 'Scores are saved when the game-over screen appears. If you close the browser or navigate away mid-game, the score is lost. Also ensure you\'re logged in — guest plays don\'t save scores.',
      },
      {
        q: 'Why does it say "Not Live" on a game?',
        a: 'A game marked "Not Live" is currently unpublished by the admin. It could be under maintenance, a future competition that hasn\'t started yet, or a past competition that has ended.',
      },
      {
        q: 'Can I play games without creating an account?',
        a: 'You can browse games but need to log in to play, earn rewards, and appear on leaderboards.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'Your password is securely hashed using industry-standard bcrypt encryption. Authentication uses JWT tokens. We never store or display your plain password.',
      },
      {
        q: 'Who do I contact for support?',
        a: 'Reach out to us at support@gamevesta.com or visit our Contact page for assistance.',
      },
    ],
  },
];

/* ── Accordion Item ── */
function AccordionItem({ question, answer, isOpen, onClick, index }) {
  return (
    <div
      style={{
        borderBottom: '1px solid color-mix(in srgb, var(--neon-cyan) 6%, transparent)',
      }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 text-left py-4 px-5 transition-all duration-200"
        style={{
          color: isOpen ? 'var(--neon-cyan)' : 'var(--text-primary)',
          background: isOpen ? 'color-mix(in srgb, var(--neon-cyan) 3%, transparent)' : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isOpen) e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 2%, transparent)';
        }}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span className="text-sm font-medium leading-relaxed flex-1">{question}</span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: isOpen ? 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)' : 'var(--input-bg)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: isOpen ? 'var(--neon-cyan)' : 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          ▼
        </span>
      </button>
      <div
        style={{
          maxHeight: isOpen ? 600 : 0,
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}
      >
        <div
          className="px-5 pb-4 text-sm leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {answer.split('\n').map((line, i) => {
            if (line.trim() === '') return <br key={i} />;
            // Handle bold **text**
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className={line.startsWith('•') ? 'pl-2 py-0.5' : 'py-0.5'}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={j} style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={j}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Section Navigation Chip ── */
function SectionChip({ title, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        background: isActive ? 'color-mix(in srgb, var(--neon-cyan) 12%, transparent)' : 'var(--subtle-overlay)',
        border: `1px solid ${isActive ? 'color-mix(in srgb, var(--neon-cyan) 30%, transparent)' : 'var(--subtle-border)'}`,
        color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)',
        boxShadow: isActive ? '0 0 12px color-mix(in srgb, var(--neon-cyan) 10%, transparent)' : 'none',
      }}
    >
      <span>{icon}</span>
      <span>{title.replace(/^[^\s]+\s/, '')}</span>
    </button>
  );
}

/* ── Main FAQ Page ── */
export default function FAQPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (sectionIdx, questionIdx) => {
    const key = `${sectionIdx}-${questionIdx}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalQuestions = faqSections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden pt-6 pb-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Frequently Asked Questions
          </h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* ── Section Navigation ── */}
        <div className="mb-8 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {faqSections.map((section, i) => (
              <SectionChip
                key={i}
                title={section.title}
                icon={section.icon}
                isActive={activeSection === i}
                onClick={() => setActiveSection(i)}
              />
            ))}
          </div>
        </div>

        {/* ── FAQ Sections ── */}
        {faqSections.map((section, sIdx) => (
          <div
            key={sIdx}
            className="mb-6"
            style={{
              display: activeSection === sIdx ? 'block' : 'none',
            }}
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {section.title.replace(/^[^\s]+\s/, '')}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {section.questions.length} question{section.questions.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Questions */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid color-mix(in srgb, var(--neon-cyan) 7%, transparent)',
              }}
            >
              {section.questions.map((item, qIdx) => (
                <AccordionItem
                  key={qIdx}
                  question={item.q}
                  answer={item.a}
                  isOpen={!!openItems[`${sIdx}-${qIdx}`]}
                  onClick={() => toggleItem(sIdx, qIdx)}
                  index={qIdx}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Bottom CTA ── */}
        <div
          className="mt-12 rounded-2xl p-6 sm:p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--neon-cyan) 6%, transparent), color-mix(in srgb, var(--neon-purple) 6%, transparent))',
            border: '1px solid color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
          }}
        >
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Still have questions?
          </h3>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Can't find what you're looking for? Reach out to us directly — we're happy to help.
          </p>
          <a
            href="mailto:support@gamevesta.com"
            className="inline-block text-sm font-semibold mb-5 transition-colors duration-200"
            style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            📧 support@gamevesta.com
          </a>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/contact"
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--neon-cyan) 25%, transparent)',
                color: 'var(--neon-cyan)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 18%, transparent)';
                e.currentTarget.style.boxShadow = '0 0 16px color-mix(in srgb, var(--neon-cyan) 15%, transparent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ✉️ Contact Us
            </Link>
            <Link
              href="/games"
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 20px color-mix(in srgb, var(--neon-cyan) 30%, transparent)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🎮 Start Playing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
