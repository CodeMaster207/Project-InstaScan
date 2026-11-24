package com.instascan.warranty.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.instascan.warranty.R
import com.instascan.warranty.ui.theme.Blush
import com.instascan.warranty.ui.theme.Navy

/** App logo: Google Material "receipt" icon (see res/drawable/ic_logo.xml) on a navy disc. */
@Composable
fun AppLogo(size: Dp = 96.dp, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(size)
            .background(Navy, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_logo),
            contentDescription = "InstaScan logo",
            tint = Blush,
            modifier = Modifier.size(size * 0.55f),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InstaPayTopBar(title: String, onMenu: () -> Unit) {
    TopAppBar(
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        },
        navigationIcon = {
            IconButton(onClick = onMenu) {
                Icon(Icons.Filled.Menu, contentDescription = "Open navigation menu")
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            titleContentColor = MaterialTheme.colorScheme.onBackground,
            navigationIconContentColor = MaterialTheme.colorScheme.onBackground,
        ),
    )
}
