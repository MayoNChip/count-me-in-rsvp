"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, AlertCircle, Users, Heart } from "lucide-react";
import { submitRsvpResponse } from "@/app/actions/rsvp";
import { cn } from "@/lib/utils";

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  eventId: string;
  token: string;
  invitationStatus: string;
  invitationSentAt: Date | null;
  invitationMethod: string | null;
  maxGuests: number;
  notes: string | null;
  rsvp?: {
    id: string;
    status: string;
    respondedAt: Date | null;
    numOfGuests: number;
    guestNames: string | null;
    message: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Event {
  id: string;
  name: string;
  date: string;
  time: string | null;
  location: string | null;
  description: string | null;
  organizerEmail?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RsvpFormProps {
  guest: Guest;
  event: Event;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const rsvpSchema = z
  .object({
    status: z.enum(["yes", "no", "maybe"]),
    numOfGuests: z.number().min(0).optional(),
    guestNames: z.string().nullable(),
    message: z
      .string()
      .max(500, "Message is too long (max 500 characters)")
      .optional(),
  })
  .refine(
    (data) => {
      // If status is Yes or Maybe, numOfGuests is required
      if (
        (data.status === "yes" || data.status === "maybe") &&
        !data.numOfGuests
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please select the number of guests",
      path: ["numOfGuests"],
    }
  )
  .refine(
    (data) => {
      // If numOfGuests > 1, guestNames is required
      if (
        data.numOfGuests &&
        data.numOfGuests > 1 &&
        (!data.guestNames || data.guestNames.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please provide the names of additional guests",
      path: ["guestNames"],
    }
  );

type RsvpFormData = z.infer<typeof rsvpSchema>;

type FormState = "idle" | "submitting" | "optimistic" | "success" | "error";

export function RsvpForm({ guest, event, onSuccess, onError }: RsvpFormProps) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<RsvpFormData>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      status: guest.rsvp?.status as "yes" | "no" | "maybe" | undefined,
      numOfGuests: guest.rsvp?.numOfGuests,
      guestNames: guest.rsvp?.guestNames || "",
      message: guest.rsvp?.message || "",
    },
  });

  const watchedStatus = form.watch("status");
  const watchedGuestCount = form.watch("numOfGuests");

  const showGuestCount = watchedStatus === "yes" || watchedStatus === "maybe";
  const showGuestNames =
    showGuestCount && watchedGuestCount && watchedGuestCount > 1;

  const onSubmit = async (data: RsvpFormData) => {
    setFormState("optimistic");
    setErrorMessage("");

    const submissionData = {
      status: data.status,
      numOfGuests: data.status === "no" ? 0 : data.numOfGuests || 1,
      guestNames: showGuestNames ? data.guestNames : null,
      message: data.message || "",
    };

    startTransition(async () => {
      setFormState("submitting");

      try {
        const result = await submitRsvpResponse(guest.token, submissionData);

        if (result.success) {
          setFormState("success");
          onSuccess?.();
        } else {
          setFormState("error");
          setErrorMessage(result.error || "Failed to submit response");
          onError?.(result.error || "Failed to submit response");
        }
      } catch (error) {
        setFormState("error");
        setErrorMessage("An unexpected error occurred");
        onError?.("An unexpected error occurred");
      }
    });
  };

  if (formState === "optimistic" || formState === "success") {
    const responseEmoji =
      form.getValues("status") === "yes"
        ? "🎉"
        : form.getValues("status") === "no"
        ? "💙"
        : "🤞";
    const responseMessage =
      form.getValues("status") === "yes"
        ? "We're excited to see you there!"
        : form.getValues("status") === "no"
        ? "We'll miss you at the celebration!"
        : "We hope you can make it!";

    return (
      <Card className="modern-card border-0">
        <CardContent className="text-center py-12">
          <div className="text-7xl mb-4">{responseEmoji}</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            RSVP Received!
          </h3>
          <p className="text-lg text-gray-600 mb-2">
            Thank you for responding to {event.name}
          </p>
          <p className="text-gray-500">{responseMessage}</p>
          {formState === "optimistic" && (
            <div className="flex items-center justify-center gap-2 text-gray-500 mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving your response...</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isLoading = formState === "submitting" || isPending;

  return (
    <Card className="modern-card border-0">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
          {guest.rsvp ? "Update Your RSVP" : "RSVP for " + event.name}
        </CardTitle>
        <p className="text-gray-600">
          {guest.rsvp
            ? "Need to change your response? No problem!"
            : "We'd love to know if you can make it!"}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Response Selection - Big Buttons */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-900 text-center block">
              Will you be attending?
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Yes Button */}
              <button
                type="button"
                onClick={() => {
                  form.setValue("status", "yes");
                  form.clearErrors("status");
                }}
                disabled={isLoading}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-200 transform hover:scale-105",
                  "flex flex-col items-center justify-center min-h-[160px] cursor-pointer",
                  watchedStatus === "yes"
                    ? "border-green-500 bg-green-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {watchedStatus === "yes" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                )}
                <div className="text-5xl mb-3">😊</div>
                <div className="text-xl font-bold text-green-700 mb-1">
                  Yes!
                </div>
                <div className="text-sm text-green-600 text-center">
                  I'll be there
                </div>
              </button>

              {/* No Button */}
              <button
                type="button"
                onClick={() => {
                  form.setValue("status", "no");
                  form.clearErrors("status");
                  form.setValue("numOfGuests", undefined);
                  form.setValue("guestNames", "");
                }}
                disabled={isLoading}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-200 transform hover:scale-105",
                  "flex flex-col items-center justify-center min-h-[160px] cursor-pointer",
                  watchedStatus === "no"
                    ? "border-red-500 bg-red-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {watchedStatus === "no" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-6 w-6 text-red-600" />
                  </div>
                )}
                <div className="text-5xl mb-3">😔</div>
                <div className="text-xl font-bold text-red-700 mb-1">No</div>
                <div className="text-sm text-red-600 text-center">
                  Can't make it
                </div>
              </button>

              {/* Maybe Button */}
              <button
                type="button"
                onClick={() => {
                  form.setValue("status", "maybe");
                  form.clearErrors("status");
                }}
                disabled={isLoading}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-200 transform hover:scale-105",
                  "flex flex-col items-center justify-center min-h-[160px] cursor-pointer",
                  watchedStatus === "maybe"
                    ? "border-amber-500 bg-amber-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {watchedStatus === "maybe" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-6 w-6 text-amber-600" />
                  </div>
                )}
                <div className="text-5xl mb-3">🤔</div>
                <div className="text-xl font-bold text-amber-700 mb-1">
                  Maybe
                </div>
                <div className="text-sm text-amber-600 text-center">
                  Not sure yet
                </div>
              </button>
            </div>

            {form.formState.errors.status && (
              <p className="text-sm text-red-600 text-center mt-2">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>

          {/* Guest Count Selection */}
          {showGuestCount && (
            <div>
              <Label
                htmlFor="guest-count"
                className="text-base font-medium text-gray-900 mb-2 block"
              >
                Number of Guests
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Including yourself (max {guest.maxGuests})
              </p>
              <Select
                value={watchedGuestCount?.toString() || ""}
                onValueChange={(value) => {
                  const count = parseInt(value, 10);
                  form.setValue("numOfGuests", count);
                  form.clearErrors("numOfGuests");

                  // Clear guest names if count becomes 1
                  if (count === 1) {
                    form.setValue("guestNames", "");
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="guest-count" aria-label="Number of Guests">
                  <SelectValue placeholder="Select number of guests" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: guest.maxGuests }, (_, i) => i + 1).map(
                    (num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              {form.formState.errors.numOfGuests && (
                <p className="text-sm text-red-600 mt-2">
                  {form.formState.errors.numOfGuests.message}
                </p>
              )}
            </div>
          )}

          {/* Guest Names */}
          {showGuestNames && (
            <div>
              <Label
                htmlFor="guest-names"
                className="text-base font-medium text-gray-900 mb-2 block"
              >
                Guest Names
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Names of additional guests (excluding yourself)
              </p>
              <Textarea
                id="guest-names"
                placeholder="e.g., Jane Smith, John Doe"
                value={form.watch("guestNames") || ""}
                onChange={(e) => {
                  form.setValue("guestNames", e.target.value);
                  form.clearErrors("guestNames");
                }}
                disabled={isLoading}
                className="min-h-[80px]"
              />

              {form.formState.errors.guestNames && (
                <p className="text-sm text-red-600 mt-2">
                  {form.formState.errors.guestNames.message}
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <Label
              htmlFor="message"
              className="text-base font-medium text-gray-900 mb-2 block"
            >
              Message{" "}
              <span className="text-gray-500 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Share a message with the host..."
              value={form.watch("message") || ""}
              onChange={(e) => {
                form.setValue("message", e.target.value);
                form.clearErrors("message");
              }}
              disabled={isLoading}
              maxLength={500}
              className="min-h-[100px]"
            />
            <div className="flex justify-between mt-2">
              <div>
                {form.formState.errors.message && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.message.message}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {(form.watch("message") || "").length}/500 characters
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {formState === "error" && errorMessage && (
            <Alert className="border-red-500">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                Failed to submit response: {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isLoading || !watchedStatus}
              className={cn(
                "w-full text-white font-semibold py-6 text-lg h-auto rounded-xl shadow-lg transition-all duration-200",
                watchedStatus === "yes" && "bg-green-600 hover:bg-green-700",
                watchedStatus === "no" && "bg-red-600 hover:bg-red-700",
                watchedStatus === "maybe" && "bg-amber-600 hover:bg-amber-700",
                !watchedStatus && "bg-gray-400 cursor-not-allowed",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>
                    {!watchedStatus
                      ? "Please select an option above"
                      : guest.rsvp
                      ? "Update My Response"
                      : "Submit My RSVP"}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
