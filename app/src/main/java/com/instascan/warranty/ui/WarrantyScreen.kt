package com.instascan.warranty.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.instascan.warranty.data.WarrantyItem
import com.instascan.warranty.data.WarrantyStatus

/** Warranty page draft: Active (not expired), Inactive (expired), Pending (needs activation). */
@Composable
fun WarrantyScreen(
    items: List<WarrantyItem>,
    onMenu: () -> Unit,
    onRemove: (Long) -> Unit,
    onActivate: (Long) -> Unit,
    onToggleNotify: (Long) -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { InstaPayTopBar(title = "Warranty", onMenu = onMenu) },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 16.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            WarrantySection(
                title = "Active", subtitle = "has not passed the expiration date",
                items = items.filter { it.status() == WarrantyStatus.Active },
                onRemove = onRemove, onToggleNotify = onToggleNotify,
            )
            WarrantySection(
                title = "Inactive", subtitle = "passed the expiration date",
                items = items.filter { it.status() == WarrantyStatus.Inactive },
                onRemove = onRemove, onToggleNotify = onToggleNotify,
            )
            WarrantySection(
                title = "Pending", subtitle = "require activation",
                items = items.filter { it.status() == WarrantyStatus.Pending },
                onRemove = onRemove, onActivate = onActivate,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun WarrantySection(
    title: String,
    subtitle: String,
    items: List<WarrantyItem>,
    onRemove: (Long) -> Unit,
    onToggleNotify: ((Long) -> Unit)? = null,
    onActivate: ((Long) -> Unit)? = null,
) {
    Spacer(Modifier.height(16.dp))
    Text(
        text = buildHeader(title, subtitle),
        style = MaterialTheme.typography.bodyLarge,
    )
    Spacer(Modifier.height(8.dp))
    Card(
        shape = RoundedCornerShape(32.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (items.isEmpty()) {
                Text(
                    "Nothing here yet",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }
            items.forEach { item ->
                WarrantyRow(item, onRemove, onToggleNotify, onActivate)
            }
        }
    }
}

@Composable
private fun buildHeader(title: String, subtitle: String) =
    androidx.compose.ui.text.buildAnnotatedString {
        pushStyle(
            androidx.compose.ui.text.SpanStyle(
                fontWeight = FontWeight.Bold,
                textDecoration = TextDecoration.Underline,
            ),
        )
        append(title)
        pop()
        append(": $subtitle")
    }

@Composable
private fun WarrantyRow(
    item: WarrantyItem,
    onRemove: (Long) -> Unit,
    onToggleNotify: ((Long) -> Unit)?,
    onActivate: ((Long) -> Unit)?,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { onRemove(item.id) }) {
            Icon(Icons.Filled.Close, contentDescription = "Remove ${item.name}")
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            val details = listOfNotNull(
                item.endDate?.let { "Ends $it" },
                item.provider.takeIf { it.isNotBlank() }?.let { "By $it" },
                item.amount.takeIf { it.isNotBlank() },
            ).joinToString(" · ")
            if (details.isNotEmpty()) {
                Text(details, style = MaterialTheme.typography.bodySmall)
            }
        }
        if (onActivate != null) {
            IconButton(onClick = { onActivate(item.id) }) {
                Icon(Icons.Filled.HourglassEmpty, contentDescription = "Add ${item.name} to active")
            }
        }
        if (onToggleNotify != null) {
            IconButton(onClick = { onToggleNotify(item.id) }) {
                Icon(
                    imageVector = if (item.notify) Icons.Filled.NotificationsActive else Icons.Filled.NotificationsOff,
                    contentDescription = if (item.notify) "Turn off reminders for ${item.name}" else "Turn on reminders for ${item.name}",
                )
            }
        }
    }
}
