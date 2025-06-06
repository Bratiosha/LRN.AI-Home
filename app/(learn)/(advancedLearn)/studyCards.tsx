import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getUserCards } from "@/lib/appwrite";
import Loading from "@/components/Loading";
import ErrorModal from "@/components/modals/ErrorModal";
import SuccessModal from "@/components/modals/SuccessModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import IncorrectButton from "@/components/buttons/IncorrectButton";
import CorrectButton from "@/components/buttons/CorrectButton";
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Card {
  cardId: string;
  frontText: string;
  backText: string;
  status: boolean;
}

const StudyCards = () => {
  const router = useRouter();
  const { deckIds } = useLocalSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEmptyDeck, setIsEmptyDeck] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const flipAnim = useSharedValue(0); // Animation shared value

  useEffect(() => {
    const fetchCards = async () => {
        if (!deckIds || typeof deckIds !== "string") {
        setIsEmptyDeck(true);
        setLoading(false);
        return;
      }

      try {
        const deckIdArray = deckIds.split(",");
        const allCards: Card[] = [];

        for (const deckId of deckIdArray) {
          const fetchedCards = await getUserCards(deckId);
          allCards.push(
            ...fetchedCards.map((card) => ({
              cardId: card.$id,
              frontText: card.frontText ?? "No question provided",
              backText: card.backText ?? "No answer provided",
              status: card.status ?? false,
            }))
          );
        }

        if (allCards.length === 0) {
          setIsEmptyDeck(true);
        } else {
          setCards(allCards);
        }
      } catch (error) {
        console.error("Error fetching cards:", error);
        setIsEmptyDeck(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [deckIds]);

  const handleNextCard = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
  
      // Add the current card back to the end of the deck
      setCards((prevCards) => [...prevCards, prevCards[currentIndex]]);
    }
  
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (isCorrect || cards.length === 1) {
        setIsReviewComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }
    setShowAnswer(false);
  };

  const handleCardPress = () => {
    flipAnim.value = withTiming(flipAnim.value === 0 ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
    setShowAnswer(!showAnswer);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnim.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnim.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
    };
  });

  if (loading) {
    return <Loading />;
  }

  if (isEmptyDeck) {
    return (
      <View className="flex-1 justify-center items-center bg-black p-5">
        <ErrorModal
          title="No Cards Available"
          subtitle="The selected decks have no cards. Please add cards before reviewing."
          isVisible={true}
          onClose={() => router.push("/home")}
        />
      </View>
    );
  }
 
  if (isReviewComplete) {
    return (
      <View className="flex-1 justify-center items-center bg-black p-5">
        <SuccessModal
          title="Review Complete"
          subtitle={`You answered ${correctCount} correctly and ${incorrectCount} incorrectly.`}
          isVisible={true}
          onClose={() => router.push("/home")}
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="m-5 flex-1">
        {/* HEADER */}
        <View className="flex-row items-center justify-between mb-5">
          <Text className="font-SegoeuiBlack text-white text-2xl">Study Cards</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* CARD CONTAINER */}
        <View className="flex-1 justify-center items-center">
          <TouchableOpacity onPress={handleCardPress}>
            <Animated.View style={[animatedStyle, styles.gradient]}>
              <LinearGradient
                colors={["#1B1C1D", "#0A0A0A"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={styles.gradient}
              >
                <View className="p-5 h-96 rounded-lg min-w-72 justify-center">
                  <Animated.Text style={[textStyle, styles.text]}>
                    {showAnswer
                      ? cards[currentIndex]?.backText
                      : cards[currentIndex]?.frontText}
                  </Animated.Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          {/* COUNT */}
          <Text className="text-secondary font-SegoeuiBold text-center text-base mt-5">
            Card {currentIndex + 1} of {cards.length}
          </Text>

          {/* NOTE CONTAINER */}
          <View style={{ height: 40, justifyContent: "center", alignItems: "center", marginTop: 10 }}>
            {!showAnswer ? (
              <Text style={{ color: "#808080", textAlign: "center" }}>
                Tap the question to reveal the answer.{'\n'}
                Then select <Text style={{ color: "#dc3545" }}>incorrect</Text> or <Text style={{ color: "#28a745" }}>correct</Text>.
              </Text>
            ) : null}
          </View>

          {/* BUTTONS */}
          <View className="flex-row justify-between mt-5 w-full gap-7 space-x-3">
            <View className="flex-1">
              <IncorrectButton
                title="Incorrect"
                onPress={() => handleNextCard(false)} // Move to next card
                whenChange={showAnswer}
              />
            </View>
            <View className="flex-1">
              <CorrectButton
                title="Correct"
                onPress={() => handleNextCard(true)} // Move to next card
                whenChange={showAnswer}
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default StudyCards;

const styles = StyleSheet.create({
  gradient: {
    borderColor: "#37383A",
    borderWidth: 2,
    padding: 16,
    borderRadius: 20,
    marginTop: 20,
    flexDirection: "column",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontSize: 20,
    fontFamily: "Segoeui",
    textAlign: "center",
  },
});