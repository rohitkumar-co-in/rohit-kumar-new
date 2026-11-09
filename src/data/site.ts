export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Services', href: '/services/' },
  { label: 'About', href: '/about/' },
];

export const brandDescriptor = 'Web Development & Automation';

export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rohitkumar-co-in' },
  { label: 'GitHub', href: 'https://github.com/rohitkumar-co-in' },
  { label: 'Instagram', href: 'https://www.instagram.com/rohitkumar_co_in' },
  { label: 'Facebook', href: 'https://www.facebook.com/rohitkumar.co.in' },
];

export const projects = [
  {
    slug: 'leadomi',
    name: 'Leadomi',
    kind: 'Follow-up for missed calls',
    url: 'https://leadomi.com',
    screenshot: '/images/leadomi.webp',
    number: '01',
    color: 'mint',
    summary: 'Leadomi helps UK trade businesses follow up when they miss a call, so more potential customers get a response and a chance to book.',
    role: 'Founder of Leadomi',
    focus: ['Call follow-up', 'Lead details', 'Callback booking'],
    caseTitle: 'Keep missed calls from becoming lost jobs.',
    caseProblemTitle: 'A missed call can end the conversation before it starts.',
    caseProblem: 'When a trade business is on a job, it may not be able to answer the phone. The caller is left waiting, and the business has no details about what they need or where the work is.',
    caseSolutionTitle: 'Follow up by text and collect the details for a next step.',
    caseSolution: 'Leadomi sends a text after a missed call, asks what the customer needs, and collects their postal code. The business can then arrange a callback or visit with useful context already in hand.',
    caseFlowTitle: 'From missed call to a clear next step.',
    caseFlow: [
      { title: 'A call goes unanswered', text: 'The business can stay focused on the job in front of them.' },
      { title: 'The caller gets a reply', text: 'Leadomi follows up by text and asks what they need.' },
      { title: 'The business gets context', text: 'The customer shares their postal code so a callback or visit can be arranged.' },
    ],
    caseValueTitle: 'Make it easier to pick up the conversation.',
    caseValue: 'Instead of returning an unknown call with no context, the team can see what the customer needs and where the work is. That gives both sides a more useful starting point for the next conversation.',
    caseBuild: 'I founded Leadomi and lead its product and development, building a practical way for trade businesses to respond when they cannot answer the phone.',
  },
  {
    slug: 'otpwala',
    name: 'OTP Wala',
    kind: 'SMS & OTP verification',
    url: 'https://otpwala.me',
    screenshot: '/images/otpwala.webp',
    number: '02',
    color: 'purple',
    summary: 'OTP Wala helps people find a virtual number for the service and country they need for SMS verification.',
    role: 'Product developer',
    focus: ['Find a service', 'Check a country', 'Get a text code'],
    caseTitle: 'Find a number without the guesswork.',
    caseProblemTitle: 'Finding a number can take too much trial and error.',
    caseProblem: 'People looking for a virtual number need one that works for a particular service and country. Without a clear way to check availability, it can be hard to know what to try next.',
    caseSolutionTitle: 'Check the service and country before choosing a number.',
    caseSolution: 'OTP Wala brings service and country availability together so people can look up what they need, check their options, and use a number for SMS verification.',
    caseFlowTitle: 'A straightforward path to an SMS code.',
    caseFlow: [
      { title: 'Choose a service', text: 'Start with the website or app that needs SMS verification.' },
      { title: 'Check a country', text: 'See which country options are available for that service.' },
      { title: 'Request the code', text: 'Use the selected number with the service and check OTP Wala for the text code.' },
    ],
    caseValueTitle: 'Know what is available before you start.',
    caseValue: 'Putting service and country options in one place gives people a clearer way to compare what is available. They can check the fit first instead of guessing which number to try.',
    caseBuild: 'I built OTP Wala to make the lookup process clear, from choosing a service and checking a country to using a number for SMS verification.',
  },
];

export const services = [
  { index: '01', title: 'Websites that bring in more leads', text: 'Clear pages and calls to action help turn visitors into customer inquiries.', mark: '↗' },
  { index: '02', title: 'Custom software / SaaS', text: 'Custom tools replace clunky workarounds and make daily tasks easier.', mark: '⌘' },
  { index: '03', title: 'APIs and custom automations', text: 'Connect your tools and handle repeat tasks automatically, so your team has more time for customers.', mark: '{ }' },
];

export const email = 'contact@rohitkumar.co.in';

export const projectPricingNote = 'Projects start at $599. Price depends on what you need. Before we start, I’ll share what’s included, the timeline, and the full price.';
