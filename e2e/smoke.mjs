import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const base = process.env.APP_URL ?? 'http://127.0.0.1:4173'
const shots = '/tmp/vmeste-shots'
mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'ru-RU',
  timezoneId: 'Europe/Moscow',
  serviceWorkers: 'block',
})
await context.addCookies([{ name: 'vmeste_scope', value: 'smoke', url: base }])
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const cleared = await page.request.delete(`${base}/api/house`)
if (!cleared.ok()) throw new Error(`Не удалось очистить тестовый бюджет: ${cleared.status()}`)
await page.clock.install({ time: new Date('2026-10-15T12:00:00+03:00') })
await page.goto(base)

await page.getByRole('heading', { name: 'Создаём бюджет' }).waitFor()
await page.getByRole('radio', { name: 'English' }).click()
await page.getByRole('heading', { name: 'Create a budget' }).waitFor()
await page.getByRole('radio', { name: 'Tiếng Việt' }).click()
await page.getByRole('heading', { name: 'Tạo ngân sách' }).waitFor()
await page.getByRole('radio', { name: 'Русский' }).click()
await page.getByRole('heading', { name: 'Создаём бюджет' }).waitFor()
await page.screenshot({ path: `${shots}/01-onboarding.png` })
await page.getByLabel('Название').fill('Наш бюджет')
await page.getByLabel('Месячный бюджет').fill('150000')
await page.getByRole('button', { name: 'Далее' }).click()

await page.getByRole('heading', { name: 'Установите лимиты по категориям' }).waitFor()
const limitsText = await page.locator('.onboard-body').last().innerText()
if (
  !limitsText.includes('Регулярные платежи') ||
  !limitsText.includes('Повседневные расходы') ||
  limitsText.indexOf('Регулярные платежи') > limitsText.indexOf('Повседневные расходы')
) {
  throw new Error('На заполнении регулярные платежи должны быть сверху')
}
await page.getByLabel('Лимит для Еда').fill('10000')
await page.getByLabel('Лимит для Жильё').fill('50000')
const createBudget = page.getByRole('button', { name: 'Создать бюджет' })
await page.getByText('Осталось распределить').waitFor()
if (await createBudget.isEnabled()) throw new Error('Бюджет создаётся, хотя распределено не 100%')
await page.screenshot({ path: `${shots}/02-limits.png` })
await page.getByLabel('Лимит для Транспорт').fill('90000')
await createBudget.click()

await page.getByText('Потрачено').waitFor()
await page.getByTestId('row-Еда').waitFor()
await page.screenshot({ path: `${shots}/03-home-empty.png` })

await page.getByRole('button', { name: 'Добавить расход' }).click()
await page.getByTestId('amount').fill('9000')
await page.getByRole('button', { name: 'Еда', exact: true }).click()
await page.getByLabel('Комментарий').fill('Обед')
await page.screenshot({ path: `${shots}/04-expense.png` })
await page.getByTestId('save-expense').click()
await page.getByText('Расход добавлен').waitFor()
await page.screenshot({ path: `${shots}/05-success.png` })
await page.getByRole('button', { name: 'Добавить ещё' }).click()

await page.getByTestId('amount').fill('20000')
await page.getByRole('button', { name: 'Жильё', exact: true }).click()
await page.getByTestId('save-expense').click()
await page.getByText('Расход добавлен').waitFor()
await page.getByRole('button', { name: 'Закрыть' }).click()

const food = page.getByTestId('row-Еда')
await food.waitFor()
const foodTone = await food.getAttribute('data-tone')
const foodText = (await food.innerText()).replace(/\s+/g, ' ')
if (foodTone !== 'over') throw new Error(`Еда должна быть красной из-за темпа, сейчас ${foodTone}: ${foodText}`)
if (!foodText.includes('90%')) throw new Error(`Нет 90% у еды: ${foodText}`)
if (!foodText.includes('Осталось') || !foodText.includes('16 дней')) {
  throw new Error(`Нет остатка на дни у еды: ${foodText}`)
}

const rent = page.getByTestId('row-Жильё')
const rentTone = await rent.getAttribute('data-tone')
const rentText = (await rent.innerText()).replace(/\s+/g, ' ')
if (rentTone !== 'ok') throw new Error(`Жильё внутри плана не должно краснеть: ${rentTone} ${rentText}`)
const homeOrder = await page.locator('section.screen').innerText()
if (
  !homeOrder.includes('Повседневные расходы') ||
  !homeOrder.includes('Регулярные платежи') ||
  homeOrder.indexOf('Повседневные расходы') > homeOrder.indexOf('Регулярные платежи')
) {
  throw new Error('На экране трат повседневные должны быть сверху')
}
await page.getByRole('button', { name: 'Добавить расход' }).click()
await page.getByTestId('amount').fill('30000')
await page.getByRole('button', { name: 'Жильё', exact: true }).click()
await page.getByTestId('save-expense').click()
await page.getByRole('button', { name: 'Закрыть' }).click()
const rentFull = await page.getByTestId('row-Жильё').getAttribute('data-tone')
if (rentFull !== 'ok') throw new Error(`Аренда на всю сумму не должна краснеть: ${rentFull}`)
await page.screenshot({ path: `${shots}/06-home.png` })

await page.getByTestId('row-Еда').click()
await page.getByRole('heading', { name: 'Еда', exact: true }).waitFor()
const foodHistory = (await page.locator('section.screen').innerText()).replace(/\s+/g, ' ')
if (!foodHistory.includes('Обед') || !foodHistory.includes('Я')) {
  throw new Error(`В истории еды нет автора: ${foodHistory}`)
}
await page.screenshot({ path: `${shots}/06b-food.png` })
await page.getByRole('button', { name: 'Назад' }).click()
await page.getByTestId('row-Еда').waitFor()

await page.getByRole('button', { name: 'История', exact: true }).click()
await page.getByText('Обед').waitFor()
await page.getByText('Сегодня, 15 окт. 2026').waitFor()
await page.screenshot({ path: `${shots}/07-history.png` })

await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Настройки' }).click()
await page.getByRole('radio', { name: 'English' }).click()
await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Home', exact: true }).click()
await page.getByRole('button', { name: 'Add expense' }).waitFor()
await page.getByText('October 2026').waitFor()
const foodEn = (await page.getByTestId('row-Еда').innerText()).replace(/\s+/g, ' ')
if (!foodEn.includes('Food')) throw new Error(`Еда не перевелась на английский: ${foodEn}`)
await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'History', exact: true }).click()
await page.getByRole('heading', { name: 'History' }).waitFor()
await page.getByText('Food').waitFor()
await page.getByText('Today').waitFor()
await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Settings', exact: true }).click()
await page.getByRole('radio', { name: 'Tiếng Việt' }).click()
await page.getByRole('navigation', { name: 'Mục' }).getByRole('button', { name: 'Trang chính', exact: true }).click()
await page.getByRole('button', { name: 'Thêm khoản chi' }).waitFor()
const foodVi = (await page.getByTestId('row-Еда').innerText()).replace(/\s+/g, ' ')
if (!foodVi.includes('Ăn uống')) throw new Error(`Еда не перевелась на вьетнамский: ${foodVi}`)
await page.getByRole('navigation', { name: 'Mục' }).getByRole('button', { name: 'Cài đặt', exact: true }).click()
await page.getByRole('radio', { name: 'Русский' }).click()
await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Главная', exact: true }).click()
await page.getByText('Еда', { exact: true }).waitFor()

await page.getByRole('button', { name: 'План', exact: true }).click()
await page.getByRole('heading', { name: 'План на месяц' }).waitFor()
const planOrder = await page.locator('section.screen').innerText()
if (
  !planOrder.includes('Регулярные платежи') ||
  !planOrder.includes('Повседневные расходы') ||
  planOrder.indexOf('Повседневные расходы') > planOrder.indexOf('Регулярные платежи')
) {
  throw new Error('В плане повседневные расходы должны быть сверху')
}
await page.getByText('Общий бюджет').waitFor()
await page.getByLabel('Лимит для Еда').waitFor()
await page.screenshot({ path: `${shots}/08-plan.png` })
const foodLimit = page.getByLabel('Лимит для Еда')
await foodLimit.fill('5000')
await foodLimit.blur()
await page.getByText('Осталось распределить').waitFor()
await page.getByRole('button', { name: 'Поставить бюджет по сумме категорий' }).click()
await page.getByRole('button', { name: 'Поставить бюджет по сумме категорий' }).waitFor({ state: 'hidden' })
await foodLimit.fill('15000')
await foodLimit.blur()
await page.getByText('155 000').waitFor()

await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Настройки' }).click()
await page.getByRole('heading', { name: 'Настройки' }).waitFor()
await page.getByRole('switch', { name: 'Контроль темпа расходов' }).waitFor()
await page.screenshot({ path: `${shots}/09-settings.png` })

await page.reload()
await page.getByTestId('row-Еда').waitFor()
const overflow = await measure(page)
if (overflow.sw > overflow.cw + 1) throw new Error(`Горизонтальный скролл на телефоне: ${overflow.sw} > ${overflow.cw}`)

await page.setViewportSize({ width: 1280, height: 800 })
await page.screenshot({ path: `${shots}/11-desktop.png` })
const wide = await measure(page)
if (wide.sw > wide.cw + 1) throw new Error(`Горизонтальный скролл на широком экране: ${wide.sw} > ${wide.cw}`)

await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Настройки' }).click()
await page.getByRole('button', { name: 'Удалить бюджет' }).click()
await page.getByRole('button', { name: 'Точно удалить' }).click()
await page.getByRole('heading', { name: 'Создаём бюджет' }).waitFor()
await page.getByLabel('Месячный бюджет').fill('1000')
await page.getByRole('button', { name: 'Далее' }).click()
await page.getByLabel('Лимит для Еда').fill('1000')
await page.getByRole('button', { name: 'Создать бюджет' }).click()
await page.getByText('Потрачено', { exact: true }).waitFor()
await page.getByRole('button', { name: 'Добавить расход' }).waitFor()
const homeTab = page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Главная' })
if ((await homeTab.getAttribute('aria-current')) !== 'page') throw new Error('После создания открылся не главный экран')
if (await page.getByRole('heading', { name: 'План на месяц' }).count()) {
  throw new Error('После создания открылся план на месяц')
}

if (errors.length) throw new Error(errors.join('\n'))
await browser.close()
console.log('smoke ok')

async function measure(target) {
  return target.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
}
