import Link from "next/link";

type Section = { title: string; paragraphs: string[] };

export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        Trang chủ
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-neutral-600">{intro}</p>
      <p className="mt-2 text-xs text-neutral-400">Cập nhật ngày 06/06/2026</p>
      <div className="mt-9 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-7 text-neutral-600">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-10 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        ThePawsome hiện là hệ thống public demo phục vụ đồ án tốt nghiệp. Nội dung
        này là baseline minh bạch với người dùng, không phải bằng chứng website đã
        hoàn tất thủ tục thông báo/đăng ký tại online.gov.vn.
      </div>
    </article>
  );
}
