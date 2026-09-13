import { ArrowRight, ArrowUpRight, ChatCircle, Heart, Phone } from "@phosphor-icons/react";
import { useKaki } from "./kaki-context";
import { Button, PageHeading } from "./ui";

const resources = [
  { name: "national mindline 1771", text: "Mental-health support and guidance, available 24/7.", phone: "1771", url: "https://mindline.sg/fsmh", chat: "https://wa.me/6566691771", chatLabel: "WhatsApp", detail: "Speak with someone or explore support on the official website." },
  { name: "Samaritans of Singapore", text: "Emotional support from trained volunteers, available 24/7.", phone: "1767", url: "https://www.sos.org.sg/faq/", chat: "https://wa.me/6591511767", chatLabel: "CareText", detail: "You can call or use their 24/7 WhatsApp service." },
];

export default function SupportHelp() {
  const { go } = useKaki();
  return <div className="support-help-page">
    <PageHeading eyebrow="SOMEONE TO TURN TO" title="Support when you need it." subtitle="You can reach these Singapore services directly, whenever you need a conversation." />
    <div className="support-help-note"><Heart size={23} weight="duotone"/><p>Listening ears on kaki offer peer support. For counselling or urgent support, the services below can help you find the right next step.</p></div>
    {resources.map(resource => <article className="card support-resource" key={resource.phone}>
      <span className="support-resource-hours">24/7 support</span><h2>{resource.name}</h2><p>{resource.text}</p>
      <div className="support-resource-actions"><a href={`tel:${resource.phone}`}><Phone size={18}/>Call {resource.phone}</a><a href={resource.chat} target="_blank" rel="noopener noreferrer"><ChatCircle size={18}/>{resource.chatLabel}<ArrowUpRight size={15}/></a></div>
      <p className="support-resource-detail">{resource.detail}</p><a className="support-official-link" href={resource.url} target="_blank" rel="noopener noreferrer">Official service website<ArrowUpRight size={15}/></a>
    </article>)}
    <section className="support-emergency"><h2>Urgent medical help</h2><p>If someone is in immediate danger and needs an emergency ambulance, call <a href="tel:995">995</a>.</p><a href="https://www.scdf.gov.sg/home/about-scdf/emergency-medical-services" target="_blank" rel="noopener noreferrer">SCDF emergency guidance<ArrowUpRight size={14}/></a></section>
    <p className="support-resource-source">These are external services. Their teams handle your calls and messages. Contact details checked against official sources on 13 September 2026.</p>
    <Button variant="secondary" className="full" onClick={() => go("support")}>Explore support groups<ArrowRight size={17}/></Button>
  </div>;
}
