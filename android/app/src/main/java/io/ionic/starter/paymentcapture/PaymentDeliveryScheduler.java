package io.ionic.starter.paymentcapture;

import android.content.Context;

import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

final class PaymentDeliveryScheduler {
    private static final String UNIQUE_WORK = "payment-event-delivery-v1";

    private PaymentDeliveryScheduler() {}

    static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PaymentDeliveryWorker.class)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context.getApplicationContext())
            .enqueueUniqueWork(UNIQUE_WORK, ExistingWorkPolicy.KEEP, request);
    }
}
