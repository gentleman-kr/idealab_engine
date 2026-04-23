import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <div className="card p-6">
        <div className="text-xs font-semibold tracking-[0.28em] text-white/50">404</div>
        <h1 className="mt-3 text-2xl font-semibold text-white">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-white/60">주소가 변경되었거나 삭제되었을 수 있어요.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="btnPrimary" href="/closing">
            클로징 대시보드로
          </Link>
        </div>
      </div>
    </main>
  );
}

