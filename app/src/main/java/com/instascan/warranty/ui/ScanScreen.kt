package com.instascan.warranty.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.instascan.warranty.data.WarrantyItem
import java.time.LocalDate
import java.time.format.DateTimeParseException

private val REMIND_OPTIONS = listOf(1, 3, 7, 14, 30)

private fun parseDate(text: String): LocalDate? =
    try {
        LocalDate.parse(text.trim())
    } catch (e: DateTimeParseException) {
        null
    }

/**
 * Scan page draft. Auto (AI) shows the camera first, then the details to verify.
 * Manual goes straight to the details form. The camera is a placeholder until CameraX is added.
 */
@Composable
fun ScanScreen(onMenu: () -> Unit, onAdd: (WarrantyItem) -> Unit) {
    var mode by rememberSaveable { mutableStateOf(0) } // 0 = Auto (AI), 1 = Manual
    var captured by rememberSaveable { mutableStateOf(false) }

    var name by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var endDate by rememberSaveable { mutableStateOf("") }
    var provider by rememberSaveable { mutableStateOf("") }
    var nextPayment by rememberSaveable { mutableStateOf("") }
    var discount by rememberSaveable { mutableStateOf("") }
    var discountPeriod by rememberSaveable { mutableStateOf("") }
    var remind by rememberSaveable { mutableStateOf(false) }
    var remindDays by rememberSaveable { mutableStateOf(7) }
    var triedToAdd by rememberSaveable { mutableStateOf(false) }

    val showForm = mode == 1 || captured
    val dateInvalid = endDate.isNotBlank() && parseDate(endDate) == null
    val nameMissing = name.isBlank()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { InstaPayTopBar(title = "Scan Receipt", onMenu = onMenu) },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 16.dp)
                .fillMaxSize(),
        ) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.align(Alignment.End)) {
                SegmentedButton(
                    selected = mode == 0,
                    onClick = { mode = 0 },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                ) { Text("Auto (AI)") }
                SegmentedButton(
                    selected = mode == 1,
                    onClick = { mode = 1 },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                ) { Text("Manual") }
            }
            Spacer(Modifier.height(12.dp))

            if (!showForm) {
                CameraPlaceholder(onCapture = { captured = true })
            } else {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (mode == 0) {
                        Text(
                            "Check the details read from your receipt.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Name") },
                        placeholder = { Text("Expense name") },
                        isError = triedToAdd && nameMissing,
                        supportingText = { if (triedToAdd && nameMissing) Text("Name is required") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = { Text("Amount") },
                        placeholder = { Text("Money") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    SectionLabel("Warranty details", "How long does it last")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = endDate,
                            onValueChange = { endDate = it },
                            label = { Text("End date") },
                            placeholder = { Text("YYYY-MM-DD") },
                            isError = dateInvalid,
                            supportingText = { if (dateInvalid) Text("Use YYYY-MM-DD") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = provider,
                            onValueChange = { provider = it },
                            label = { Text("By") },
                            placeholder = { Text("Seller / Manufacturer") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }

                    SectionLabel("Subscription details", "The next cycle will start at when")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = nextPayment,
                            onValueChange = { nextPayment = it },
                            label = { Text("Next payment at") },
                            placeholder = { Text("Date") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = discount,
                            onValueChange = { discount = it },
                            label = { Text("Discount given") },
                            placeholder = { Text("%") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    OutlinedTextField(
                        value = discountPeriod,
                        onValueChange = { discountPeriod = it },
                        label = { Text("Discount valid period") },
                        placeholder = { Text("Start date - End date") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = remind, onCheckedChange = { remind = it })
                        Text("Remind me when", fontWeight = FontWeight.Bold)
                    }
                    if (remind) {
                        RemindDropdown(days = remindDays, onChange = { remindDays = it })
                    }
                    Spacer(Modifier.height(4.dp))
                }

                Button(
                    onClick = {
                        triedToAdd = true
                        if (!nameMissing && !dateInvalid) {
                            onAdd(
                                WarrantyItem(
                                    name = name.trim(),
                                    amount = amount.trim(),
                                    endDate = parseDate(endDate),
                                    provider = provider.trim(),
                                    nextPayment = nextPayment.trim(),
                                    discountPercent = discount.trim(),
                                    discountPeriod = discountPeriod.trim(),
                                    remindDays = if (remind) remindDays else null,
                                ),
                            )
                            name = ""; amount = ""; endDate = ""; provider = ""
                            nextPayment = ""; discount = ""; discountPeriod = ""
                            remind = false; remindDays = 7
                            captured = false; triedToAdd = false
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.End)
                        .padding(vertical = 12.dp),
                ) { Text("Add!") }
            }
        }
    }
}

@Composable
private fun CameraPlaceholder(onCapture: () -> Unit) {
    Card(
        shape = RoundedCornerShape(32.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .height(520.dp),
    ) {
        Box(Modifier.fillMaxSize()) {
            Text(
                "Camera preview",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.align(Alignment.Center),
            )
            FloatingActionButton(
                onClick = onCapture,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(24.dp),
            ) {
                Icon(Icons.Filled.CameraAlt, contentDescription = "Scan receipt")
            }
        }
    }
}

@Composable
private fun SectionLabel(title: String, hint: String) {
    Column {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(hint, style = MaterialTheme.typography.bodySmall)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RemindDropdown(days: Int, onChange: (Int) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = "$days days",
            onValueChange = {},
            readOnly = true,
            label = { Text("Before the end date") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            REMIND_OPTIONS.forEach { option ->
                DropdownMenuItem(
                    text = { Text("$option days") },
                    onClick = {
                        onChange(option)
                        expanded = false
                    },
                )
            }
        }
    }
}
