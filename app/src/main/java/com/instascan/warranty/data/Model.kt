package com.instascan.warranty.data

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import java.time.LocalDate

enum class WarrantyStatus { Active, Inactive, Pending }

data class WarrantyItem(
    val id: Long = 0,
    val name: String,
    val amount: String = "",
    val endDate: LocalDate? = null,
    val provider: String = "",
    val nextPayment: String = "",
    val discountPercent: String = "",
    val discountPeriod: String = "",
    val remindDays: Int? = null,
    val activated: Boolean = false,
    val notify: Boolean = false,
) {
    /** Pending until the user activates it; then Active until the end date has passed. */
    fun status(today: LocalDate = LocalDate.now()): WarrantyStatus = when {
        !activated -> WarrantyStatus.Pending
        endDate != null && endDate.isBefore(today) -> WarrantyStatus.Inactive
        else -> WarrantyStatus.Active
    }
}

/** In-memory only for now. Persistence (Room) and AI extraction come later. */
class AppViewModel : ViewModel() {
    val items = mutableStateListOf<WarrantyItem>()
    private var nextId = 1L

    fun add(item: WarrantyItem) {
        items.add(item.copy(id = nextId++, notify = item.remindDays != null))
    }

    fun remove(id: Long) {
        items.removeAll { it.id == id }
    }

    fun activate(id: Long) = update(id) { it.copy(activated = true) }

    fun toggleNotify(id: Long) = update(id) { it.copy(notify = !it.notify) }

    private fun update(id: Long, change: (WarrantyItem) -> WarrantyItem) {
        val index = items.indexOfFirst { it.id == id }
        if (index >= 0) items[index] = change(items[index])
    }
}
