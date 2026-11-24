package com.instascan.warranty.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Subscriptions
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.instascan.warranty.data.AppViewModel
import kotlinx.coroutines.launch

private enum class Destination(val label: String, val icon: ImageVector, val inCore: Boolean) {
    Scan("Scan Receipt", Icons.Outlined.Receipt, true),
    Warranty("Warranty", Icons.Outlined.VerifiedUser, true),
    Subscriptions("Subscriptions Overview", Icons.Outlined.Subscriptions, false),
    Expenses("Expenses Overview", Icons.Outlined.BarChart, false),
    Sync("Sync Settings", Icons.Outlined.Sync, false),
}

@Composable
fun InstaPayApp(vm: AppViewModel = viewModel()) {
    var signedIn by rememberSaveable { mutableStateOf(false) }
    var offline by rememberSaveable { mutableStateOf(true) }
    var destination by rememberSaveable { mutableStateOf(Destination.Scan) }

    if (!signedIn) {
        SignInScreen(
            onRegister = { offline = false; signedIn = true },
            onUseOffline = { offline = true; signedIn = true },
        )
        return
    }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val openMenu: () -> Unit = { scope.launch { drawerState.open() } }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = MaterialTheme.colorScheme.background) {
                Column(Modifier.fillMaxSize().padding(16.dp)) {
                    AppLogo(size = 56.dp)
                    Spacer(Modifier.height(16.dp))
                    Destination.entries.forEach { item ->
                        NavigationDrawerItem(
                            label = { Text(item.label, fontWeight = FontWeight.Bold) },
                            icon = { Icon(item.icon, contentDescription = null) },
                            selected = item == destination,
                            onClick = {
                                destination = item
                                scope.launch { drawerState.close() }
                            },
                            colors = NavigationDrawerItemDefaults.colors(
                                selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                                unselectedContainerColor = MaterialTheme.colorScheme.background,
                            ),
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    Text("Account:", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    OutlinedCard(Modifier.fillMaxWidth()) {
                        // TODO: show the signed-in email or username once registration exists.
                        Text(
                            text = if (offline) "Offline mode" else "Email / Username",
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                    Spacer(Modifier.height(24.dp))
                    Text(
                        text = "InstaPay",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.Underline,
                    )
                }
            }
        },
    ) {
        when (destination) {
            Destination.Scan -> ScanScreen(
                onMenu = openMenu,
                onAdd = {
                    vm.add(it)
                    destination = Destination.Warranty
                },
            )
            Destination.Warranty -> WarrantyScreen(
                items = vm.items,
                onMenu = openMenu,
                onRemove = vm::remove,
                onActivate = vm::activate,
                onToggleNotify = vm::toggleNotify,
            )
            else -> ComingSoonScreen(title = destination.label, onMenu = openMenu)
        }
    }
}

@Composable
private fun ComingSoonScreen(title: String, onMenu: () -> Unit) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { InstaPayTopBar(title = title, onMenu = onMenu) },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Coming soon", style = MaterialTheme.typography.titleMedium)
        }
    }
}
