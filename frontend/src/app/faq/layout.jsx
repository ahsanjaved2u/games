export const metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Find answers to common questions about GameVesta — how games work, how to earn money, withdrawal process, competitions, wallet, and more.',
  alternates: { canonical: 'https://gamevesta.com/faq' },
  openGraph: {
    title: 'FAQ | GameVesta',
    description: 'Answers to your questions about playing games, earning rewards, withdrawals, and competitions on GameVesta.',
    url: 'https://gamevesta.com/faq',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is GameVesta?', acceptedAnswer: { '@type': 'Answer', text: 'GameVesta is a skill-based browser gaming platform where you can play HTML5 games, earn real PKR cash rewards, and compete with other players for prize pools.' } },
    { '@type': 'Question', name: 'Is it free to join?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Creating an account is completely free. Many games are also free to play. Some games have optional entry fees for higher earning potential.' } },
    { '@type': 'Question', name: 'How do I earn money?', acceptedAnswer: { '@type': 'Answer', text: 'In rewarding games your score is converted to PKR using a conversion rate. In competitive games, fixed prizes are awarded to top-ranked players when the competition ends.' } },
    { '@type': 'Question', name: 'How do I withdraw money?', acceptedAnswer: { '@type': 'Answer', text: 'Go to the Wallet page, enter the amount, choose your payment method (Bank Transfer, EasyPaisa, or JazzCash), enter your account details and confirm. An admin will process the request.' } },
    { '@type': 'Question', name: 'What devices can I play on?', acceptedAnswer: { '@type': 'Answer', text: 'GameVesta works on any modern browser — desktop, laptop, tablet, or mobile phone. Games are fully responsive.' } },
  ],
};

export default function FAQLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
