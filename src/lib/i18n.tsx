import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { code: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
  { code: "es", label: "Español", short: "ES", flag: "🇪🇸" },
  { code: "ar", label: "العربية", short: "AR", flag: "🇸🇦" },
  { code: "nl", label: "Nederlands", short: "NL", flag: "🇳🇱" },
  { code: "zh", label: "中文", short: "ZH", flag: "🇨🇳" },
  { code: "ru", label: "Русский", short: "RU", flag: "🇷🇺" },
  { code: "ja", label: "日本語", short: "JA", flag: "🇯🇵" },
  { code: "ko", label: "한국어", short: "KO", flag: "🇰🇷" },
  { code: "hi", label: "हिन्दी", short: "HI", flag: "🇮🇳" },
  { code: "th", label: "ไทย", short: "TH", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", short: "VI", flag: "🇻🇳" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "sc_lang";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.earn": "Earn",
  "nav.notifications": "Notifications",
  "nav.community": "Community",
  "nav.cashout": "Cashout",
  "nav.history": "History",
  "nav.admin": "Admin",
  "nav.profile": "Profile",
  "nav.menu": "Menu",
  "nav.more": "More",
  "nav.logout": "Logout",
  "auth.signIn": "Sign In",
  "auth.signUp": "Sign Up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.backHome": "← Back to home",
  "auth.demoAccounts": "demo accounts",
  "common.language": "Language",
  "common.balance": "Balance",
  "common.onHold": "On Hold",
  "common.totalEarned": "Total Earned",
  "common.submit": "Submit",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.loading": "Loading...",
  "landing.getStarted": "Get Started",
  "landing.startNow": "Start Now",
  "landing.promote": "Promote",
  "landing.pricing": "Pricing",
  "landing.faq": "FAQ",
};

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.earn": "Gagner",
  "nav.notifications": "Notifications",
  "nav.community": "Communauté",
  "nav.cashout": "Retrait",
  "nav.history": "Historique",
  "nav.admin": "Admin",
  "nav.profile": "Profil",
  "nav.menu": "Menu",
  "nav.more": "Plus",
  "nav.logout": "Déconnexion",
  "auth.signIn": "Connexion",
  "auth.signUp": "S'inscrire",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.backHome": "← Retour à l'accueil",
  "auth.demoAccounts": "comptes démo",
  "common.language": "Langue",
  "common.balance": "Solde",
  "common.onHold": "En attente",
  "common.totalEarned": "Total gagné",
  "common.submit": "Envoyer",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.loading": "Chargement...",
  "landing.getStarted": "Commencer",
  "landing.startNow": "Commencer maintenant",
  "landing.promote": "Promouvoir",
  "landing.pricing": "Tarifs",
  "landing.faq": "FAQ",
};

const es: Dict = {
  "nav.home": "Inicio",
  "nav.earn": "Ganar",
  "nav.notifications": "Notificaciones",
  "nav.community": "Comunidad",
  "nav.cashout": "Retirar",
  "nav.history": "Historial",
  "nav.admin": "Admin",
  "nav.profile": "Perfil",
  "nav.menu": "Menú",
  "nav.more": "Más",
  "nav.logout": "Cerrar sesión",
  "auth.signIn": "Iniciar sesión",
  "auth.signUp": "Registrarse",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "auth.backHome": "← Volver al inicio",
  "auth.demoAccounts": "cuentas demo",
  "common.language": "Idioma",
  "common.balance": "Saldo",
  "common.onHold": "En espera",
  "common.totalEarned": "Total ganado",
  "common.submit": "Enviar",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.loading": "Cargando...",
  "landing.getStarted": "Empezar",
  "landing.startNow": "Empieza ahora",
  "landing.promote": "Promocionar",
  "landing.pricing": "Precios",
  "landing.faq": "Preguntas",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.earn": "اربح",
  "nav.notifications": "الإشعارات",
  "nav.community": "المجتمع",
  "nav.cashout": "السحب",
  "nav.history": "السجل",
  "nav.admin": "الإدارة",
  "nav.profile": "الملف الشخصي",
  "nav.menu": "القائمة",
  "nav.more": "المزيد",
  "nav.logout": "تسجيل الخروج",
  "auth.signIn": "تسجيل الدخول",
  "auth.signUp": "إنشاء حساب",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.backHome": "← العودة إلى الرئيسية",
  "auth.demoAccounts": "حسابات تجريبية",
  "common.language": "اللغة",
  "common.balance": "الرصيد",
  "common.onHold": "قيد الانتظار",
  "common.totalEarned": "إجمالي الأرباح",
  "common.submit": "إرسال",
  "common.cancel": "إلغاء",
  "common.close": "إغلاق",
  "common.loading": "جارٍ التحميل...",
  "landing.getStarted": "ابدأ",
  "landing.startNow": "ابدأ الآن",
  "landing.promote": "روّج",
  "landing.pricing": "الأسعار",
  "landing.faq": "الأسئلة الشائعة",
};

const nl: Dict = {
  "nav.home": "Home",
  "nav.earn": "Verdienen",
  "nav.notifications": "Meldingen",
  "nav.community": "Community",
  "nav.cashout": "Uitbetalen",
  "nav.history": "Geschiedenis",
  "nav.admin": "Beheer",
  "nav.profile": "Profiel",
  "nav.menu": "Menu",
  "nav.more": "Meer",
  "nav.logout": "Uitloggen",
  "auth.signIn": "Inloggen",
  "auth.signUp": "Registreren",
  "auth.email": "E-mail",
  "auth.password": "Wachtwoord",
  "auth.backHome": "← Terug naar home",
  "auth.demoAccounts": "demo-accounts",
  "common.language": "Taal",
  "common.balance": "Saldo",
  "common.onHold": "In behandeling",
  "common.totalEarned": "Totaal verdiend",
  "common.submit": "Verzenden",
  "common.cancel": "Annuleren",
  "common.close": "Sluiten",
  "common.loading": "Laden...",
  "landing.getStarted": "Aan de slag",
  "landing.startNow": "Start nu",
  "landing.promote": "Promoten",
  "landing.pricing": "Prijzen",
  "landing.faq": "FAQ",
};

const KEYS = Object.keys(en);
function make(values: string[]): Dict {
  const d: Dict = {};
  KEYS.forEach((k, i) => { if (values[i]) d[k] = values[i]; });
  return d;
}

const zh = make(["首页","赚取","通知","社区","提现","历史","管理","个人资料","菜单","更多","退出登录","登录","注册","电子邮件","密码","← 返回首页","演示账户","语言","余额","冻结中","总收益","提交","取消","关闭","加载中...","开始","立即开始","推广","价格","常见问题"]);
const ru = make(["Главная","Заработок","Уведомления","Сообщество","Вывод","История","Админ","Профиль","Меню","Ещё","Выйти","Войти","Регистрация","Эл. почта","Пароль","← На главную","демо-аккаунты","Язык","Баланс","В ожидании","Всего заработано","Отправить","Отмена","Закрыть","Загрузка...","Начать","Начать сейчас","Продвигать","Цены","Вопросы"]);
const ja = make(["ホーム","稼ぐ","通知","コミュニティ","出金","履歴","管理","プロフィール","メニュー","その他","ログアウト","ログイン","新規登録","メール","パスワード","← ホームに戻る","デモアカウント","言語","残高","保留中","総収益","送信","キャンセル","閉じる","読み込み中...","始める","今すぐ始める","プロモート","料金","よくある質問"]);
const ko = make(["홈","수익","알림","커뮤니티","출금","내역","관리자","프로필","메뉴","더보기","로그아웃","로그인","회원가입","이메일","비밀번호","← 홈으로","데모 계정","언어","잔액","보류 중","총 수익","제출","취소","닫기","로딩 중...","시작하기","지금 시작","홍보","요금","FAQ"]);
const hi = make(["होम","कमाएँ","सूचनाएँ","समुदाय","निकासी","इतिहास","एडमिन","प्रोफ़ाइल","मेनू","और","लॉग आउट","साइन इन","साइन अप","ईमेल","पासवर्ड","← होम पर वापस","डेमो खाते","भाषा","बैलेंस","होल्ड पर","कुल कमाई","जमा करें","रद्द करें","बंद करें","लोड हो रहा है...","शुरू करें","अभी शुरू करें","प्रचार","मूल्य","सामान्य प्रश्न"]);
const th = make(["หน้าแรก","รับรายได้","การแจ้งเตือน","ชุมชน","ถอนเงิน","ประวัติ","ผู้ดูแล","โปรไฟล์","เมนู","เพิ่มเติม","ออกจากระบบ","เข้าสู่ระบบ","สมัครสมาชิก","อีเมล","รหัสผ่าน","← กลับหน้าแรก","บัญชีทดลอง","ภาษา","ยอดเงิน","รอดำเนินการ","รายได้ทั้งหมด","ส่ง","ยกเลิก","ปิด","กำลังโหลด...","เริ่มต้น","เริ่มเลย","โปรโมท","ราคา","คำถามที่พบบ่อย"]);
const vi = make(["Trang chủ","Kiếm tiền","Thông báo","Cộng đồng","Rút tiền","Lịch sử","Quản trị","Hồ sơ","Menu","Thêm","Đăng xuất","Đăng nhập","Đăng ký","Email","Mật khẩu","← Về trang chủ","tài khoản demo","Ngôn ngữ","Số dư","Đang giữ","Tổng thu nhập","Gửi","Hủy","Đóng","Đang tải...","Bắt đầu","Bắt đầu ngay","Quảng bá","Bảng giá","Câu hỏi"]);

const DICTS: Record<LangCode, Dict> = { en, fr, es, ar, nl, zh, ru, ja, ko, hi, th, vi };

function detectDeviceLang(): LangCode {
  if (typeof navigator === "undefined") return "en";
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const c of candidates) {
    const base = c.toLowerCase().split("-")[0] as LangCode;
    if (base in DICTS) return base;
  }
  return "en";
}

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, fallback?: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k, f) => f ?? en[k] ?? k, dir: "ltr" });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  // Hydration-safe: resolve stored/device language after mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    setLangState(stored && stored in DICTS ? stored : detectDeviceLang());
    const onChange = () => {
      if (!window.localStorage.getItem(STORAGE_KEY)) setLangState(detectDeviceLang());
    };
    window.addEventListener("languagechange", onChange);
    return () => window.removeEventListener("languagechange", onChange);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang: (l) => {
        window.localStorage.setItem(STORAGE_KEY, l);
        setLangState(l);
      },
      t: (key, fallback) => DICTS[lang]?.[key] ?? en[key] ?? fallback ?? key,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
