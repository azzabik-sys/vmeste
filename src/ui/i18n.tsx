import { createContext, useContext, useState, type ReactNode } from 'react'
import { setFormatLocale } from '../domain/formatLocale'

export const LANGS = [
  { id: 'ru', label: 'Русский', locale: 'ru-RU' },
  { id: 'en', label: 'English', locale: 'en-US' },
  { id: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' },
] as const

export type Lang = (typeof LANGS)[number]['id']

const TEXT = {
  ru: {
    createTitle: 'Создаём бюджет',
    createSub: 'Задайте основные параметры',
    name: 'Название',
    personName: 'Имя',
    currency: 'Валюта',
    monthly: 'Месячный бюджет',
    next: 'Далее',
    limitsTitle: 'Установите лимиты по категориям',
    limitsSub: 'Распределите всю сумму бюджета по категориям',
    allocated: 'Распределено',
    addCategory: 'Добавить категорию',
    add: 'Добавить',
    createBudget: 'Создать бюджет',
    nameCategory: 'Укажите название категории',
    overBy: 'Лимиты больше бюджета на {amount}',
    leftToAllocate: 'Осталось распределить {amount}',
    defaultBudget: 'Наш бюджет',
    me: 'Я',
    back: 'Назад',
    iconOf: 'Значок {name}',
    categoryFallback: 'категории',
    categoryName: 'Название категории',
    limitFor: 'Лимит для {name}',
    deleteCategory: 'Удалить {name}',
    joinCode: 'Присоединиться по коду',
    yourName: 'Ваше имя',
    code: 'Код',
    joinBudget: 'Войти в бюджет',
    joinTitle: 'Подключиться к бюджету',
    joinHave: 'Бюджет «{name}» уже есть. Напишите своё имя, и расходы будут в нём.',
    joinHavePlain: 'Напишите своё имя, чтобы войти в бюджет.',
    shareHint: 'На втором телефоне откройте этот же адрес и введите своё имя. В истории будет видно, кто внёс расход.',
    matchBudget: 'Подстроить под категории',
    samePhone: 'Письмо со входом открывайте на этом же телефоне.',
    language: 'Язык',
    spent: 'Потрачено',
    spentOf: 'из {amount}',
    addExpense: 'Добавить расход',
    participants: 'Участники',
    settings: 'Настройки',
    home: 'Главная',
    history: 'История',
    stats: 'Статистика',
    plan: 'План',
    sections: 'Разделы',
    newExpense: 'Новый расход',
    save: 'Сохранить',
    amount: 'Сумма',
    expenseCurrency: 'Валюта расхода',
    todayDate: 'Сегодня, {date}',
    date: 'Дата',
    comment: 'Комментарий',
    commentPlaceholder: 'Комментарий (необязательно)',
    expenseAdded: 'Расход добавлен',
    addAnother: 'Добавить ещё',
    close: 'Закрыть',
    search: 'Поиск',
    filter: 'Фильтр',
    all: 'Все',
    noExpenses: 'Пока нет расходов',
    expense: 'Расход',
    category: 'Категория',
    delete: 'Удалить',
    planTitle: 'План на месяц',
    totalBudget: 'Общий бюджет ({symbol})',
    editBudget: 'Изменить бюджет',
    period: 'Период',
    pace: 'Контроль темпа расходов',
    paceHint: 'Показывать предупреждения, если тратим быстрее плана',
    paceAbove: 'Расходы выше плана',
    paceLeft: 'Осталось {amount} на {days}',
    paceOver: 'Бюджет превышен на {amount}',
    categories: 'Категории',
    regularTitle: 'Регулярные платежи',
    regularHint: 'Оплачиваются разово или по расписанию',
    dailyTitle: 'Повседневные расходы',
    dailyHint: 'Траты в течение месяца',
    deleteBudget: 'Удалить бюджет',
    deleteSure: 'Точно удалить',
    orderOf: 'Порядок {name}',
    categoryNameOf: 'Название категории {name}',
    newCategory: 'Новая категория',
    namePlaceholder: 'Название',
    copyCode: 'Копировать код',
    copyLink: 'Копировать ссылку',
    copied: 'Скопировано',
    copyManual: 'Выделите код и скопируйте вручную',
    thisIsYou: 'это вы',
    inBudget: 'в бюджете',
    leave: 'Выйти',
    leaveBudget: 'Выйти из бюджета',
    signOut: 'Выйти из аккаунта',
    localNote: 'Бюджет хранится на этом телефоне. Код для второго телефона появится, когда подключим общий вход.',
    opening: 'Открываем бюджет',
    openFailed: 'Не удалось открыть бюджет',
    retry: 'Попробовать ещё раз',
    signIn: 'Вход',
    signInSub: 'Почта и пароль. Письмо не придёт.',
    email: 'Почта',
    emailPlaceholder: 'вы@почта.ru',
    password: 'Пароль',
    passwordHint: 'Не короче 6 символов',
    createLogin: 'Создать вход',
    sendLink: 'Прислать ссылку',
    mailSent: 'Письмо ушло на {email}. Откройте его здесь же.',
    catFood: 'Еда',
    catTransport: 'Транспорт',
    catHome: 'Жильё',
    catShop: 'Покупки',
    catGame: 'Развлечения',
    catCard: 'Подписки',
    catHeart: 'Здоровье',
    catCoffee: 'Кафе',
    catUtilities: 'Коммунальные',
  },
  en: {
    createTitle: 'Create a budget',
    createSub: 'Set the basics',
    name: 'Name',
    personName: 'Name',
    currency: 'Currency',
    monthly: 'Monthly budget',
    next: 'Next',
    limitsTitle: 'Set category limits',
    limitsSub: 'Split the whole budget across categories',
    allocated: 'Allocated',
    addCategory: 'Add category',
    add: 'Add',
    createBudget: 'Create budget',
    nameCategory: 'Enter a category name',
    overBy: 'Limits exceed the budget by {amount}',
    leftToAllocate: 'Left to allocate {amount}',
    defaultBudget: 'Our budget',
    me: 'Me',
    back: 'Back',
    iconOf: 'Icon for {name}',
    categoryFallback: 'category',
    categoryName: 'Category name',
    limitFor: 'Limit for {name}',
    deleteCategory: 'Delete {name}',
    joinCode: 'Join with a code',
    yourName: 'Your name',
    code: 'Code',
    joinBudget: 'Join budget',
    joinTitle: 'Join the budget',
    joinHave: 'The budget “{name}” is already here. Enter your name and your spending will be in it.',
    joinHavePlain: 'Enter your name to join the budget.',
    shareHint: 'On the second phone, open this same address and enter your name. History will show who added each expense.',
    matchBudget: 'Match the categories',
    samePhone: 'Open the sign-in email on this same phone.',
    language: 'Language',
    spent: 'Spent',
    spentOf: 'of {amount}',
    addExpense: 'Add expense',
    participants: 'People',
    settings: 'Settings',
    home: 'Home',
    history: 'History',
    stats: 'Statistics',
    plan: 'Plan',
    sections: 'Sections',
    newExpense: 'New expense',
    save: 'Save',
    amount: 'Amount',
    expenseCurrency: 'Expense currency',
    todayDate: 'Today, {date}',
    date: 'Date',
    comment: 'Comment',
    commentPlaceholder: 'Comment (optional)',
    expenseAdded: 'Expense added',
    addAnother: 'Add another',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    noExpenses: 'No expenses yet',
    expense: 'Expense',
    category: 'Category',
    delete: 'Delete',
    planTitle: 'Monthly plan',
    totalBudget: 'Total budget ({symbol})',
    editBudget: 'Edit budget',
    period: 'Period',
    pace: 'Spending pace',
    paceHint: 'Warn if spending is faster than the plan',
    paceAbove: 'Spending is ahead of plan',
    paceLeft: '{amount} left for {days}',
    paceOver: 'Over budget by {amount}',
    categories: 'Categories',
    regularTitle: 'Regular payments',
    regularHint: 'Paid once or on a schedule',
    dailyTitle: 'Everyday spending',
    dailyHint: 'Spending through the month',
    deleteBudget: 'Delete budget',
    deleteSure: 'Delete for sure',
    orderOf: 'Order of {name}',
    categoryNameOf: 'Category name {name}',
    newCategory: 'New category',
    namePlaceholder: 'Name',
    copyCode: 'Copy code',
    copyLink: 'Copy link',
    copied: 'Copied',
    copyManual: 'Select the code and copy it manually',
    thisIsYou: 'you',
    inBudget: 'in the budget',
    leave: 'Leave',
    leaveBudget: 'Leave budget',
    signOut: 'Sign out',
    localNote: 'This budget stays on this phone. A code for the second phone will appear when shared sign-in is connected.',
    opening: 'Opening the budget',
    openFailed: 'Could not open the budget',
    retry: 'Try again',
    signIn: 'Sign in',
    signInSub: 'Email and password. No email will arrive.',
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    password: 'Password',
    passwordHint: 'At least 6 characters',
    createLogin: 'Create sign-in',
    sendLink: 'Send link',
    mailSent: 'The email went to {email}. Open it on this phone.',
    catFood: 'Food',
    catTransport: 'Transport',
    catHome: 'Home',
    catShop: 'Shopping',
    catGame: 'Fun',
    catCard: 'Subscriptions',
    catHeart: 'Health',
    catCoffee: 'Cafe',
    catUtilities: 'Utilities',
  },
  vi: {
    createTitle: 'Tạo ngân sách',
    createSub: 'Nhập thông tin chính',
    name: 'Tên',
    personName: 'Tên',
    currency: 'Tiền tệ',
    monthly: 'Ngân sách tháng',
    next: 'Tiếp tục',
    limitsTitle: 'Đặt hạn mức cho từng hạng mục',
    limitsSub: 'Phân bổ toàn bộ ngân sách vào các hạng mục',
    allocated: 'Đã phân bổ',
    addCategory: 'Thêm hạng mục',
    add: 'Thêm',
    createBudget: 'Tạo ngân sách',
    nameCategory: 'Nhập tên hạng mục',
    overBy: 'Hạn mức vượt ngân sách {amount}',
    leftToAllocate: 'Còn cần phân bổ {amount}',
    defaultBudget: 'Ngân sách nhà',
    me: 'Mình',
    back: 'Quay lại',
    iconOf: 'Biểu tượng {name}',
    categoryFallback: 'hạng mục',
    categoryName: 'Tên hạng mục',
    limitFor: 'Hạn mức cho {name}',
    deleteCategory: 'Xóa {name}',
    joinCode: 'Vào bằng mã',
    yourName: 'Tên của bạn',
    code: 'Mã',
    joinBudget: 'Vào ngân sách',
    joinTitle: 'Vào ngân sách chung',
    joinHave: 'Ngân sách «{name}» đã có. Nhập tên của bạn, các khoản chi sẽ vào đó.',
    joinHavePlain: 'Nhập tên của bạn để vào ngân sách.',
    shareHint: 'Trên điện thoại thứ hai, mở cùng địa chỉ này và nhập tên. Lịch sử sẽ cho biết ai đã ghi khoản chi.',
    matchBudget: 'Khớp với các hạng mục',
    samePhone: 'Hãy mở email đăng nhập trên chính điện thoại này.',
    language: 'Ngôn ngữ',
    spent: 'Đã chi',
    spentOf: 'trong {amount}',
    addExpense: 'Thêm khoản chi',
    participants: 'Thành viên',
    settings: 'Cài đặt',
    home: 'Trang chính',
    history: 'Lịch sử',
    stats: 'Thống kê',
    plan: 'Kế hoạch',
    sections: 'Mục',
    newExpense: 'Khoản chi mới',
    save: 'Lưu',
    amount: 'Số tiền',
    expenseCurrency: 'Tiền tệ của khoản chi',
    todayDate: 'Hôm nay, {date}',
    date: 'Ngày',
    comment: 'Ghi chú',
    commentPlaceholder: 'Ghi chú (không bắt buộc)',
    expenseAdded: 'Đã thêm khoản chi',
    addAnother: 'Thêm nữa',
    close: 'Đóng',
    search: 'Tìm kiếm',
    filter: 'Lọc',
    all: 'Tất cả',
    noExpenses: 'Chưa có khoản chi',
    expense: 'Khoản chi',
    category: 'Hạng mục',
    delete: 'Xóa',
    planTitle: 'Kế hoạch tháng',
    totalBudget: 'Tổng ngân sách ({symbol})',
    editBudget: 'Sửa ngân sách',
    period: 'Kỳ',
    pace: 'Theo dõi tốc độ chi',
    paceHint: 'Báo khi chi nhanh hơn kế hoạch',
    paceAbove: 'Chi nhanh hơn kế hoạch',
    paceLeft: 'Còn {amount} cho {days}',
    paceOver: 'Vượt ngân sách {amount}',
    categories: 'Hạng mục',
    regularTitle: 'Khoản cố định',
    regularHint: 'Trả một lần hoặc theo lịch',
    dailyTitle: 'Chi tiêu hằng ngày',
    dailyHint: 'Chi trong tháng',
    deleteBudget: 'Xóa ngân sách',
    deleteSure: 'Xóa hẳn',
    orderOf: 'Thứ tự {name}',
    categoryNameOf: 'Tên hạng mục {name}',
    newCategory: 'Hạng mục mới',
    namePlaceholder: 'Tên',
    copyCode: 'Sao chép mã',
    copyLink: 'Sao chép liên kết',
    copied: 'Đã sao chép',
    copyManual: 'Hãy chọn mã và sao chép thủ công',
    thisIsYou: 'là bạn',
    inBudget: 'trong ngân sách',
    leave: 'Rời',
    leaveBudget: 'Rời ngân sách',
    signOut: 'Đăng xuất',
    localNote: 'Ngân sách đang lưu trên điện thoại này. Mã cho điện thoại thứ hai sẽ có khi bật đăng nhập chung.',
    opening: 'Đang mở ngân sách',
    openFailed: 'Không mở được ngân sách',
    retry: 'Thử lại',
    signIn: 'Đăng nhập',
    signInSub: 'Email và mật khẩu. Không có email gửi về.',
    email: 'Email',
    emailPlaceholder: 'ban@email.com',
    password: 'Mật khẩu',
    passwordHint: 'Ít nhất 6 ký tự',
    createLogin: 'Tạo đăng nhập',
    sendLink: 'Gửi liên kết',
    mailSent: 'Email đã gửi tới {email}. Hãy mở trên điện thoại này.',
    catFood: 'Ăn uống',
    catTransport: 'Đi lại',
    catHome: 'Nhà ở',
    catShop: 'Mua sắm',
    catGame: 'Giải trí',
    catCard: 'Đăng ký',
    catHeart: 'Sức khỏe',
    catCoffee: 'Cà phê',
    catUtilities: 'Tiện ích',
  },
} as const

export type TextKey = keyof typeof TEXT.ru

const STORAGE_KEY = 'vmeste.lang'

function readLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'ru' || value === 'en' || value === 'vi') return value
  } catch {
    // Хранилище может быть закрыто. Остаётся русский.
  }
  return 'ru'
}

function fill(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TextKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)
  const locale = LANGS.find((item) => item.id === lang)?.locale ?? 'ru-RU'
  setFormatLocale(locale)
  if (typeof document !== 'undefined') document.documentElement.lang = lang

  function setLang(next: Lang) {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Язык останется до закрытия вкладки.
    }
  }

  const value: I18nValue = {
    lang,
    setLang,
    t: (key, vars) => fill(TEXT[lang][key], vars),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n вызван вне I18nProvider')
  return value
}

const PRESET_BY_ICON: Record<string, TextKey> = {
  food: 'catFood',
  car: 'catTransport',
  home: 'catHome',
  shop: 'catShop',
  game: 'catGame',
  card: 'catCard',
  heart: 'catHeart',
  coffee: 'catCoffee',
  bill: 'catUtilities',
}

export function categoryKey(icon: string): TextKey {
  return PRESET_BY_ICON[icon] ?? 'catShop'
}

export function categoryLabel(icon: string, t: I18nValue['t']): string {
  return t(categoryKey(icon))
}

export function categoryTitle(icon: string, storedName: string, t: I18nValue['t']): string {
  const key = PRESET_BY_ICON[icon]
  const trimmed = storedName.trim()
  if (!key || !trimmed) return storedName
  const known = (Object.keys(TEXT) as Lang[]).some((lang) => TEXT[lang][key] === trimmed)
  return known ? t(key) : storedName
}

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-switch" role="radiogroup" aria-label={t('language')}>
      {LANGS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={lang === item.id}
          onClick={() => setLang(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
