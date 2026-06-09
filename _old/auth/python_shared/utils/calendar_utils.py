
from datetime import timedelta
import calendar


def last_day_of_month(any_day):
    return (any_day.replace(day=1) + timedelta(days=31)).replace(day=1) - timedelta(days=1)


def monthdelta(date, delta):
    m, y = (date.month + delta) % 12, date.year + (date.month + delta - 1) // 12
    if not m:
        m = 12
    d = min(date.day, calendar.monthrange(y, m)[1])
    return date.replace(day=d, month=m, year=y)
